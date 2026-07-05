import { createServer } from "node:http";
import {
  addLearningProposal,
  addRecap,
  authorizeRound,
  buildDesignPreflight,
  collectGitStatus,
  collectStatus,
  doctor,
  prepareHandoff,
  prepareSensitiveAction,
  saveLocalProfile,
  updateGoal,
  updateWorkPackage,
  writePortableExport
} from "./lib.mjs";

const HOST = "127.0.0.1";
const PORT = Number(process.env.MASTERBUILD_PORT ?? 8010);

function send(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "http://127.0.0.1:5175",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
  });
  response.end(JSON.stringify(body));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 256_000) {
      throw new Error("Corps de requête trop volumineux.");
    }
  }
  return body ? JSON.parse(body) : {};
}

const server = createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    send(response, 204, {});
    return;
  }

  try {
    const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
    if (request.method === "GET" && url.pathname === "/health") {
      send(response, 200, { ok: true, service: "masterbuild", mode: "prepare-only" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/control-api/status") {
      send(response, 200, await collectStatus());
      return;
    }
    if (request.method === "GET" && url.pathname === "/control-api/git") {
      send(response, 200, await collectGitStatus());
      return;
    }
    if (request.method === "GET" && url.pathname === "/control-api/doctor") {
      send(response, 200, await doctor());
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/goals") {
      send(response, 200, await updateGoal(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/design-preflight") {
      send(response, 200, await buildDesignPreflight(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/rounds/authorize") {
      send(response, 200, await authorizeRound(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/work-packages") {
      send(response, 200, await updateWorkPackage(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/exports/prepare") {
      send(response, 200, await writePortableExport());
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/profile") {
      send(response, 200, await saveLocalProfile(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/handoff/prepare") {
      send(response, 200, await prepareHandoff());
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/recaps") {
      send(response, 200, await addRecap(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/learning/proposals") {
      send(response, 200, await addLearningProposal(await readBody(request)));
      return;
    }
    if (request.method === "POST" && url.pathname === "/control-api/actions/prepare") {
      const body = await readBody(request);
      send(response, 200, prepareSensitiveAction(body.action, await collectGitStatus()));
      return;
    }
    send(response, 404, { error: "Route MASTERBUILD inconnue." });
  } catch (error) {
    send(response, 500, {
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`MASTERBUILD service prêt sur http://${HOST}:${PORT}`);
});
