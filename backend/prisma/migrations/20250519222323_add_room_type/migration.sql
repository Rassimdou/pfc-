/*
  Warnings:

  - Added the required column `roomType` to the `SurveillanceAssignment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `surveillanceassignment` ADD COLUMN `roomType` ENUM('SALLE_TP', 'SALLE_TD', 'SALLE_COURS') NOT NULL;
