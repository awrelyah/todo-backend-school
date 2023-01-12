const express = require("express");
const fs = require("fs");
const argon2 = require("argon2");
const crypto = require("crypto");
const app = express();
const port = 3000;

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

/**
 * JSDOC
 * @typedef Task
 * @property {string} name
 * @property {bool} completed
 */
/**
 * @typedef User
 * @property {int} id
 * @property {string} name
 * @property {string} email
 * @property {string} password
 */
/**
 * @typedef Session
 * @property {int} userId
 * @property {string} token
 * @property {string} createdAt
 * @property {string} name
 */

/** @type {Task[]} */
let tasks = readJsonFile("tasks.json", []);
/** @type {User[]} */
let users = readJsonFile("users.json", []);
/** @type {Session[]} */
let sessions = readJsonFile("sessions.json", []);
let lastIDs = readJsonFile("lastIDs.json", {
  lastTaskId: 0,
  lastUserId: 0,
});

const publicPages = [
  { path: "/" },
  { path: "/users", method: "POST" },
  { path: "/sessions", method: "POST" },
];

function isPublicPage(obj, path, method) {
  if (obj.path != path) return false;
  if (!obj.method) return true;
  if (obj.method != method) return false;

  return true;
}

app.use((req, res, next) => {
  // Allow public pages
  if (publicPages.find((page) => isPublicPage(page, req.path, req.method))) {
    return next();
  }

  // remove expired sessions
  sessions = sessions.filter((s) => Date.parse(s.createdAt) + 1000 * 60 * 60 * 24 > Date.now());
  writeJsonFile("sessions.json", sessions);

  // is session  token valid
  let sessionToken = (req.header("authorization") ?? "").substring(7); //deletes 'Bearer' from beginning
  let session = sessions.find((s) => s.token == sessionToken);
  if (!session) {
    return res.status(401).send({ error: "Unauthorized" });
  }

  req.currentSession = session;

  next();
});

app.get("/", (req, res) => {
  res.send("api doc");
});

//user registration
app.post("/users", async (req, res) => {
  req.body.id = ++lastIDs.lastUserId;

  try {
    req.body.password = await argon2.hash(req.body.password);
  } catch (err) {
    res.status(500).send({ error: "Failed to create user", err });
  }

  users.push(req.body);
  res.send(req.body);
  writeJsonFile("users.json", users);
  writeJsonFile("lastIDs.json", lastIDs);
});

//login
app.post("/sessions", async (req, res) => {
  let user = users.find((user) => user.email == req.body.email);

  if (!(await argon2.verify(user?.password, req.body.password))) {
    res.status(400).send({ error: "Credentials did not match" });
    return;
  }

  //create new session
  const session = {
    userId: user.id,
    token: crypto.randomBytes(64).toString("hex"),
    createdAt: Date().toString,
    name: "",
  };

  sessions.push(session);
  res.send(session);
  writeJsonFile("sessions.json", sessions);
});

app.get("/tasks", (req, res) => {
  //filter out users tasks
  res.send(tasks.filter((task) => task.userId == req.currentSession.userId));
});

app.post("/tasks", (req, res) => {
  req.body.id = ++lastIDs.lastTaskId;
  req.body.userId = req.currentSession.userId;
  tasks.push(req.body);
  res.send(req.body);
  writeJsonFile("tasks.json", tasks);
  writeJsonFile("lastIDs.json", lastIDs);
});

app.put("/tasks/:id", (req, res) => {
  //check if user owns this task
  if (
    !tasks.find(
      (task) =>
        task.id == req.params.id && task.userId == req.currentSession.userId
    )
  )
    return res.status(404).send({ error: "Task not found" });

  let task = tasks.find((task) => task.id == req.params.id);

  //remove forbidden values
  delete req.body.id;
  delete req.body.createdAt;

  for (const key in task) {
    //if (!["id", "createdAt"].inlcludes(key))  alternative removal of forbidden values
    task[key] = req.body[key];
  }
  res.send(task);
  writeJsonFile("tasks.json", tasks);
});

app.delete("/tasks/:id", (req, res) => {
  //check if user owns this task
  if (
    !tasks.find(
      (task) =>
        task.id == req.params.id && task.userId == req.currentSession.userId
    )
  )
    return res.status(404).send({ error: "Task not found" });

  //db.command("DELETE task WHERE name = ':name'", {name: req.params.name})
  let index = tasks.findIndex((task) => task.id == req.params.id);
  if (index != -1) tasks.splice(index, 1);
  res.status(204).send();
  writeJsonFile("tasks.json", tasks);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

function readJsonFile(fileName, defaultValue) {
  try {
    let data = fs.readFileSync("data/" + fileName, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error(err);
    return defaultValue;
  }
}

function writeJsonFile(fileName, data) {
  try {
    fs.writeFileSync("data/" + fileName, JSON.stringify(data));
  } catch (err) {
    console.error(err, data);
  }
}
