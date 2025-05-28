/*
  Warnings:

  - You are about to drop the column `classroomId` on the `scheduleslot` table. All the data in the column will be lost.
  - You are about to drop the `classroom` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `roomId` on table `scheduleslot` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `scheduleslot` DROP FOREIGN KEY `ScheduleSlot_classroomId_fkey`;

-- DropForeignKey
ALTER TABLE `scheduleslot` DROP FOREIGN KEY `ScheduleSlot_roomId_fkey`;

-- AlterTable
ALTER TABLE `scheduleslot` DROP COLUMN `classroomId`,
    MODIFY `roomId` INTEGER NOT NULL;

-- DropTable
DROP TABLE `classroom`;

-- AddForeignKey
ALTER TABLE `ScheduleSlot` ADD CONSTRAINT `ScheduleSlot_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `Room`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
