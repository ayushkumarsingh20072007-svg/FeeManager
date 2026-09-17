import sqlite3

def run_migration():
    conn = sqlite3.connect('backend/agent40.db')
    cursor = conn.cursor()

    cursor.execute('PRAGMA table_info(students);')
    columns = [col[1] for col in cursor.fetchall()]
    print('Existing columns:', columns)

    if 'cgpa' not in columns:
        cursor.execute('ALTER TABLE students ADD COLUMN cgpa REAL DEFAULT 8.2;')
        print('Added cgpa column to students')
    else:
        print('cgpa column already exists')

    cursor.execute('UPDATE students SET cgpa = 8.4 WHERE roll_no = "STU1001";')
    cursor.execute('UPDATE students SET cgpa = 7.1 WHERE roll_no = "STU1002";')
    cursor.execute('UPDATE students SET cgpa = 7.9 WHERE roll_no = "STU1003";')
    conn.commit()

    cursor.execute('SELECT roll_no, cgpa, attendance_percentage, entrance_exam FROM students;')
    for row in cursor.fetchall():
        print('Student:', row)
    conn.close()

if __name__ == '__main__':
    run_migration()
