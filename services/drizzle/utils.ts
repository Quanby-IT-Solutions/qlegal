import { pgTableCreator } from "drizzle-orm/pg-core"
import { v4 as uuidv4 } from "uuid"

export const createTable = pgTableCreator(name => name)

export const randomId = () => uuidv4()
