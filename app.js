const format = require("date-fns/format");
const isValid = require("date-fns/isValid");
const toDate = require("date-fns/toDate");

const express = require("express");
const app = express();
app.use(express.json());

const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dataBasePath = path.join(__dirname, "todoApplication.db");
let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dataBasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log(`Server Running at "http://localhost:3000"`);
    });
  } catch (error) {
    console.log(`Data Base Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const changeQueryCase = (query) => {
  return {
    id: query.id,
    todo: query.todo,
    priority: query.priority,
    status: query.status,
    category: query.category,
    dueDate: query.due_date,
  };
};

//Possible values for category, status, priority.
const categoryArray = ["WORK", "HOME", "LEARNING"];
const priorityArray = ["HIGH", "MEDIUM", "LOW"];
const statusArray = ["TO DO", "IN PROGRESS", "DONE"];

//function for query filter and validating
const validateRequest = async (request, response, next) => {
  const { id, search_q, category, status, priority, date } =
    JSON.stringify(request.body) !== "{}" ? request.body : request.query;
  console.log(id, search_q, category, status, priority, date);
  const { todoId } = request.params;
  if (category !== undefined) {
    if (categoryArray.includes(category)) {
      request.category = category;
      console.log(category);
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  if (status !== undefined) {
    if (statusArray.includes(status)) {
      request.status = status;
      console.log(status);
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (priority !== undefined) {
    if (priorityArray.includes(priority)) {
      request.priority = priority;
      console.log(priority);
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (date !== undefined) {
    try {
      const givenDate = new Date(date);
      console.log(givenDate);
      const formattedDate = format(new Date(date), "yyyy-MM-dd");
      console.log(formattedDate);
      const newDate = toDate(
        new Date(
          `${givenDate.getFullYear()}-${
            givenDate.getMonth() + 1
          }-${givenDate.getDate()}`
        )
      );
      console.log(newDate);
      console.log(new Date(), "--> current Date");
      const isDateValid = await isValid(newDate);
      console.log(isDateValid, "--> validated Date");

      if (isDateValid) {
        request.date = newDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
        return;
      }
    } catch (error) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.id = id;
  request.todoId = todoId;
  request.search_q = search_q;
  next();
};

//API 1
app.get("/todos/", validateRequest, async (request, response) => {
  const { status = "", search_q = "", priority = "", category = "" } = request;

  const getAllStatusTodo = `
    SELECT *
    FROM todo
    WHERE status LIKE '%${status}%' 
      AND priority LIKE '%${priority}%'
      AND todo LIKE '%${search_q}%'
      AND category LIKE '%${category}%';`;
  const queryResult = await db.all(getAllStatusTodo);
  response.send(queryResult.map((eachResult) => changeQueryCase(eachResult)));
});

//API 2
app.get("/todos/:todoId/", validateRequest, async (request, response) => {
  const { todoId } = request.params;
  const getAllTodo = `
    SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
    FROM todo
    WHERE 
      id = ${todoId};`;
  const queryResult = await db.get(getAllTodo);
  console.log(queryResult);
  //   response.send(changeQueryCase(queryResult));
});

//API 3
app.get("/agenda/", validateRequest, async (request, response) => {
  const { date } = request.query;
  const getAllTodo = `
    SELECT 
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
    FROM todo
    WHERE 
      due_date = '${date}';`;
  const queryResult = await db.all(getAllTodo);
  response.send(queryResult);
});

//API 4
app.post("/todos/", validateRequest, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const postTodo = `
    INSERT INTO todo( 
      id,
      todo,
      priority,
      status,
      category,
      due_date)
    VALUES (
        ${id}, 
        '${todo}', 
        '${priority}', 
        '${status}', 
        '${category}', 
        '${dueDate}'
    );`;
  await db.run(postTodo);
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId/", validateRequest, async (request, response) => {
  let updatedColumn = "";
  const { todoId } = request.params;
  //To find the updated value.
  switch (true) {
    case request.todo !== undefined:
      updatedColumn = "Todo";
      break;
    case request.priority !== undefined:
      updatedColumn = "Priority";
      break;
    case request.status !== undefined:
      updatedColumn = "Status";
      break;
    case request.category !== undefined:
      updatedColumn = "category";
      break;
    case request.dueDate !== undefined:
      updatedColumn = "Due Date";
      break;
  }

  const pastTodoQuery = `
    SELECT *
    FROM todo
    WHERE id = ${todoId};`;
  const pastTodo = await db.get(pastTodoQuery);
  const {
    todo = pastTodo.todo,
    priority = pastTodo.priority,
    status = pastTodo.status,
    category = pastTodo.category,
    dueDate = pastTodo.due_date,
  } = request.body;

  const updateTodoQuery = `
    UPDATE todo
    SET 
        id = ${todoId};,
        priority = '${priority}',
        status = '${status}',
        category = '${category},
        due_date = '${dueDate}'
    WHERE
        id = ${todoId};`;
  await db.run(updateTodoQuery);
  response.send(`${updatedColumn} Updated`);
});

//API 6
app.delete("/todos/:todoId/", validateRequest, async (request, response) => {
  const { todoId } = request.params;
  const deleteTodo = `
    DELETE FROM todo
    WHERE 
      id = ${todoId};`;
  await db.run(deleteTodo);
  response.send("Todo Deleted");
});
module.exports = app;
