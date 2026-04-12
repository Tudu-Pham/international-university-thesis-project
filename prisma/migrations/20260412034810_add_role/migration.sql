/*
  Warnings:

  - Added the required column `role_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `videos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `role_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `videos` ADD COLUMN `user_id` INTEGER NOT NULL;

-- CreateTable
CREATE TABLE `video_players` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `video_id` INTEGER NOT NULL,
    `player_id` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `videos` ADD CONSTRAINT `videos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_players` ADD CONSTRAINT `video_players_video_id_fkey` FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `video_players` ADD CONSTRAINT `video_players_player_id_fkey` FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
