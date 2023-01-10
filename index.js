const express = require("express");
const app = express();
const port = 3000;

app.use(express.json()); // for parsing application/json
app.use(express.urlencoded({ extended: true }));

/**
 * JSDOC
 * @typedef Task
 * @property {string} name
 * @property {string} completed
 */

/**
 * @type Task[]
 */
let tasks = [];

let lastTaskId = 0;

app.get("/", (req, res) => {
  res.send("api doc");
});

app.get("/tasks", (req, res) => {
  res.send(tasks);
});

app.post("/tasks", (req, res) => {
  req.body.id = ++lastTaskId;
  res.send(req.body);
  tasks.push(req.body);
});

app.put("/tasks/:id", (req, res) => {
  let task = tasks.find((task) => task.id == req.params.id);

  if (!task) {
    res.status(404).send({ error: "Task not found" });
    return;
  }

  //remove forbidden values
  delete req.body.id;
  delete req.body.createdAt;

  for (const key in task) {
    //if (!["id", "createdAt"].inlcludes(key))  alternative removal of forbidden values
    task[key] = req.body[key];
  }
  res.send(task);
});

app.delete("/tasks/:id", (req, res) => {
  //db.command("DELETE task WHERE name = ':name'", {name: req.params.name})
  let index = tasks.findIndex((task) => task.id == req.params.id);
  if (index != -1) tasks.splice(index, 1);
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
