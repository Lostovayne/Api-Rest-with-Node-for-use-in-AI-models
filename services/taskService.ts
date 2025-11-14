import pool from "../db";

export const addTask = async (task: string, userId?: number): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = userId
      ? await client.query(
          "INSERT INTO user_tasks (task, user_id) VALUES ($1, $2) RETURNING *",
          [task, userId]
        )
      : await client.query("INSERT INTO user_tasks (task) VALUES ($1) RETURNING *", [
          task,
        ]);
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getTasks = async (status?: string, userId?: number): Promise<any[]> => {
  const client = await pool.connect();
  try {
    const params: Array<string | number> = [];
    const conditions: string[] = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }

    if (userId) {
      params.push(userId);
      conditions.push(`(user_id = $${params.length} OR user_id IS NULL)`);
    }

    let query = "SELECT * FROM user_tasks";
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }
    query += " ORDER BY created_at ASC";

    const result = await client.query(query, params);
    return result.rows;
  } finally {
    client.release();
  }
};

export const updateTaskStatus = async (taskId: number, status: string): Promise<any> => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "UPDATE user_tasks SET status = $1 WHERE id = $2 RETURNING *",
      [status, taskId]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
};

export const getDailyRecommendations = async (
  userId?: number
): Promise<{ tasks: string[]; timeOfDay: string }> => {
  const client = await pool.connect();
  try {
    const params: Array<string | number> = ["pending"];
    let query = "SELECT task FROM user_tasks WHERE status = $1";

    if (userId) {
      params.push(userId);
      query += ` AND (user_id = $${params.length} OR user_id IS NULL)`;
    }

    query += " ORDER BY created_at ASC";

    const result = await client.query(query, params);
    const pendingTasks = result.rows.map((task) => task.task as string);

    const hour = new Date().getHours();
    let timeOfDay: string;
    if (hour >= 5 && hour < 12) {
      timeOfDay = "mañana";
    } else if (hour >= 12 && hour < 18) {
      timeOfDay = "tarde";
    } else {
      timeOfDay = "noche";
    }

    return { tasks: pendingTasks, timeOfDay };
  } finally {
    client.release();
  }
};
