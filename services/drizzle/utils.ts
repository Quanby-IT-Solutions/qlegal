import { pgTableCreator } from "drizzle-orm/pg-core"

export const createTable = pgTableCreator(name => name)

export const randomId = () => crypto.randomUUID()
