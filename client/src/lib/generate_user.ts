import { generateSlug } from "random-word-slugs";
import { v4 as uuidv4 } from "uuid";

function getRandomAvatar() {
    const number = Math.floor(Math.random() * 12) + 1;
    return `avatars/avatar-${number}.svg`;
}

export function generateUser() {
    const slug = generateSlug(2);
    const shortNumber = Math.floor(1000 + Math.random() * 9000);
    const username = `${slug}-${shortNumber}`;

    const userId = uuidv4();
    const avatarUrl = getRandomAvatar();

    return { username, userId, avatarUrl };
}
