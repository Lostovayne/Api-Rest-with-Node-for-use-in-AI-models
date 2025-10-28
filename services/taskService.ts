import pool from '../db';

export const addTask = async (task: string): Promise<any> => {
    const client = await pool.connect();
    try {
        const result = await client.query(
            'INSERT INTO user_tasks (task) VALUES ($1) RETURNING *',
            [task]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};

export const getTasks = async (status?: string): Promise<any[]> => {
    const client = await pool.connect();
    try {
        let query = 'SELECT * FROM user_tasks';
        const params = [];
        if (status) {
            query += ' WHERE status = $1';
            params.push(status);
        }
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
            'UPDATE user_tasks SET status = $1 WHERE id = $2 RETURNING *',
            [status, taskId]
        );
        return result.rows[0];
    } finally {
        client.release();
    }
};
