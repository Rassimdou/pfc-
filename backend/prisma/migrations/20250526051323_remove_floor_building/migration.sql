/*
  Warnings:

  - You are about to drop the column `description` on the `module` table. All the data in the column will be lost.
  - You are about to drop the column `building` on the `room` table. All the data in the column will be lost.
  - You are about to drop the column `floor` on the `room` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Section_moduleId_academicYear_idx` ON `section`;

-- AlterTable
ALTER TABLE `module` DROP COLUMN `description`;

-- AlterTable
ALTER TABLE `room` DROP COLUMN `building`,
    DROP COLUMN `floor`;
