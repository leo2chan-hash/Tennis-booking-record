import { getDatabase } from "@netlify/database";

const db = getDatabase();
const allowedStatus = new Set(["Confirmed", "Pending", "Completed", "Cancelled"]);

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function time(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || "") ? value : "";
}

function cleanState(input) {
  if (!input || !Array.isArray(input.players) || !Array.isArray(input.bookings)) {
    throw new Error("Invalid data format");
  }

  const players = [...new Set(input.players.map((p) => text(p, 60)).filter(Boolean))].slice(0, 100);
  const playerSet = new Set(players);
  const bookings = input.bookings.slice(0, 1000).map((b) => {
    const courts = Array.isArray(b.courts) ? b.courts.slice(0, 20).map((c) => ({
      number: text(c?.number ?? c, 30),
      start: time(c?.start ?? b.start),
      end: time(c?.end ?? b.end)
    })).filter((c) => c.number && c.start && c.end && c.end > c.start) : [];

    const selectedPlayers = Array.isArray(b.players)
      ? [...new Set(b.players.map((p) => text(p, 60)).filter((p) => playerSet.has(p)))].slice(0, 40)
      : [];

    const start = courts.map((c) => c.start).sort()[0] || time(b.start);
    const end = courts.map((c) => c.end).sort().at(-1) || time(b.end);
    const status = allowedStatus.has(b.status) ? b.status : "Confirmed";

    if (!text(b.id, 80) || !/^\d{4}-\d{2}-\d{2}$/.test(b.date || "") ||
        !text(b.venue, 120) || !courts.length || !selectedPlayers.length ||
        !start || !end || end <= start) {
      throw new Error("One or more bookings are invalid");
    }

    return {
      id: text(b.id, 80),
      date: b.date,
      start,
      end,
      venue: text(b.venue, 120),
      courts,
      players: selectedPlayers,
      booker1: playerSet.has(b.booker1) ? b.booker1 : selectedPlayers[0],
      booker2: playerSet.has(b.booker2) && b.booker2 !== b.booker1 ? b.booker2 : "",
      status,
      remarks: text(b.remarks, 500)
    };
  });

  return { players, bookings };
}

export default async (req) => {
  try {
    if (req.method === "GET") {
      const rows = await db.sql`
        SELECT data, revision, updated_at
        FROM tennis_app_state
        WHERE id = 1
      `;
      const row = rows[0];
      return json({ data: row.data, revision: Number(row.revision), updatedAt: row.updated_at });
    }

    if (req.method === "PUT") {
      const length = Number(req.headers.get("content-length") || 0);
      if (length > 500000) return json({ error: "Request is too large" }, 413);

      const body = await req.json();
      const expectedRevision = Number(body.expectedRevision);
      if (!Number.isInteger(expectedRevision) || expectedRevision < 1) {
        return json({ error: "Missing or invalid revision" }, 400);
      }

      const data = cleanState(body.data);
      const rows = await db.sql`
        UPDATE tennis_app_state
        SET data = ${JSON.stringify(data)}::jsonb,
            revision = revision + 1,
            updated_at = NOW()
        WHERE id = 1 AND revision = ${expectedRevision}
        RETURNING data, revision, updated_at
      `;

      if (!rows.length) {
        const current = await db.sql`
          SELECT data, revision, updated_at
          FROM tennis_app_state
          WHERE id = 1
        `;
        return json({
          error: "The booking list was changed by another person.",
          data: current[0].data,
          revision: Number(current[0].revision),
          updatedAt: current[0].updated_at
        }, 409);
      }

      return json({
        data: rows[0].data,
        revision: Number(rows[0].revision),
        updatedAt: rows[0].updated_at
      });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error(error);
    return json({ error: error.message || "Database operation failed" }, 500);
  }
};

export const config = {
  path: "/api/data"
};
