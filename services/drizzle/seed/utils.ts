import { faker } from "@faker-js/faker"

export function generateAvatar(): string {
	return faker.image.avatar()
}
