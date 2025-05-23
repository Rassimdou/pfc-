/*
  Warnings:

  - You are about to drop the column `palier` on the `module` table. All the data in the column will be lost.
  - You are about to drop the column `palier` on the `section` table. All the data in the column will be lost.
  - You are about to drop the column `palier` on the `speciality` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[name,palierId,yearId]` on the table `Speciality` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `yearId` to the `Module` table without a default value. This is not possible if the table is not empty.
  - Added the required column `yearId` to the `Speciality` table without a default value. This is not possible if the table is not empty.
*/
-- DropIndex
DROP INDEX Speciality_name_key ON speciality;
DROP INDEX Speciality_name_palier_idx ON speciality;

-- AlterTable
ALTER TABLE module DROP COLUMN palier;
ALTER TABLE module ADD COLUMN yearId INT NULL;
ALTER TABLE section DROP COLUMN palier;
ALTER TABLE section ADD COLUMN yearId INT NULL;
ALTER TABLE speciality DROP COLUMN palier;
ALTER TABLE speciality ADD COLUMN yearId INT NULL;

-- CreateTable
CREATE TABLE Year (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(191) NOT NULL,
    palierId INT NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes and Uniques for Year
CREATE INDEX Year_palierId_idx ON Year(palierId);
CREATE UNIQUE INDEX Year_name_palierId_key ON Year(name, palierId);

-- Set all existing module and section yearId to NULL
UPDATE module SET yearId = NULL;
UPDATE section SET yearId = NULL;
UPDATE speciality SET yearId = NULL;

-- Make yearId columns required for module and speciality
ALTER TABLE module MODIFY COLUMN yearId INT NOT NULL;
ALTER TABLE speciality MODIFY COLUMN yearId INT NOT NULL;

-- CreateIndex
CREATE INDEX Module_yearId_idx ON module(yearId);
CREATE INDEX Section_yearId_idx ON section(yearId);
CREATE INDEX Speciality_name_palierId_yearId_idx ON speciality(name, palierId, yearId);
CREATE UNIQUE INDEX Speciality_name_palierId_yearId_key ON speciality(name, palierId, yearId);

-- AddForeignKey
ALTER TABLE Year ADD CONSTRAINT Year_palierId_fkey FOREIGN KEY (palierId) REFERENCES Palier(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE speciality ADD CONSTRAINT Speciality_yearId_fkey FOREIGN KEY (yearId) REFERENCES Year(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE module ADD CONSTRAINT Module_yearId_fkey FOREIGN KEY (yearId) REFERENCES Year(id) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE section ADD CONSTRAINT Section_yearId_fkey FOREIGN KEY (yearId) REFERENCES Year(id) ON DELETE SET NULL ON UPDATE CASCADE;
