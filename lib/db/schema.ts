import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";

// ---------- ENUMS ----------
export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const questionTypeEnum = pgEnum("question_type", [
  "mcq",
  "true_false",
  "fill_blank",
  "essay",
]);
export const examStatusEnum = pgEnum("exam_status", [
  "draft",
  "published",
  "closed",
]);

// ---------- USERS ----------
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull(),
  regNumber: text("reg_number").unique(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- CLASSES ----------
export const classes = pgTable("classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g. "JSS2A"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- SUBJECTS ----------
export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(), // e.g. "Mathematics"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- STUDENT -> CLASS ----------
export const studentClasses = pgTable("student_classes", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .references(() => users.id)
    .notNull(),
  classId: uuid("class_id")
    .references(() => classes.id)
    .notNull(),
});

// ---------- TEACHER PERMISSIONS (subject + class) ----------
export const teacherAssignments = pgTable("teacher_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  teacherId: uuid("teacher_id")
    .references(() => users.id)
    .notNull(),
  subjectId: uuid("subject_id")
    .references(() => subjects.id)
    .notNull(),
  classId: uuid("class_id")
    .references(() => classes.id)
    .notNull(),
});

// ---------- QUESTIONS ----------
export const questions = pgTable("questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  subjectId: uuid("subject_id")
    .references(() => subjects.id)
    .notNull(),
  type: questionTypeEnum("type").notNull(),
  questionText: text("question_text").notNull(),
  options: jsonb("options"), // { A: "...", B: "...", C: "...", D: "..." }
  correctAnswer: text("correct_answer"), // "B" or "True" etc, null for essay
  topic: text("topic"),
  difficulty: text("difficulty"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- EXAMS ----------
export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  subjectId: uuid("subject_id")
    .references(() => subjects.id)
    .notNull(),
  classId: uuid("class_id")
    .references(() => classes.id)
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => users.id)
    .notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  shuffleQuestions: boolean("shuffle_questions").default(true),
  status: examStatusEnum("status").default("draft").notNull(),
  resultsReleased: boolean("results_released").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------- EXAM QUESTIONS (which questions belong to which exam) ----------
export const examQuestions = pgTable("exam_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .references(() => exams.id)
    .notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
  order: integer("order").notNull(),
});

// ---------- EXAM ATTEMPTS ----------
export const examAttempts = pgTable("exam_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .references(() => exams.id)
    .notNull(),
  studentId: uuid("student_id")
    .references(() => users.id)
    .notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  submittedAt: timestamp("submitted_at"),
  score: integer("score"), // objective score, auto-computed
  totalPossible: integer("total_possible"),
  gradingComplete: boolean("grading_complete").default(false),
  tabSwitchCount: integer("tab_switch_count").default(0),
  questionOrder: jsonb("question_order"), // array of question IDs, fixed at attempt creation
});

// ---------- ANSWERS ----------
export const answers = pgTable("answers", {
  id: uuid("id").defaultRandom().primaryKey(),
  attemptId: uuid("attempt_id")
    .references(() => examAttempts.id)
    .notNull(),
  questionId: uuid("question_id")
    .references(() => questions.id)
    .notNull(),
  studentAnswer: text("student_answer"),
  isCorrect: boolean("is_correct"), // null for essay until graded
  pointsAwarded: integer("points_awarded"),
  teacherComment: text("teacher_comment"),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  userRole: text("user_role"),
  action: text("action").notNull(), // e.g. "created_teacher", "published_exam", "graded_answer"
  details: jsonb("details"), // freeform context, e.g. { examId, examTitle }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(), // email or reg number attempted
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});