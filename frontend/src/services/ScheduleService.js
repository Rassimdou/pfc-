import api from '@/utils/axios';

const ScheduleService = {
  async saveSchedule(scheduleData, options) {
    try {
      const response = await api.post('/admin/schedules/section/bulk', {
        specialityName: options.specialityName,
        academicYear: options.academicYear,
        semester: options.semester,
        sectionName: options.sectionName,
        scheduleEntries: scheduleData.scheduleEntries
      });

      return response.data;
    } catch (error) {
      console.error('Error saving schedule:', error);
      throw error;
    }
  },

  async getSchedules(params) {
    try {
      const response = await api.get('/admin/schedules/section', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching schedules:', error);
      throw error;
    }
  },

  async addSchedule(scheduleData) {
    try {
      const response = await api.post('/admin/schedules/section', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error adding schedule:', error);
      throw error;
    }
  },

  async updateSchedule(scheduleId, scheduleData) {
    try {
      const response = await api.put(`/admin/schedules/section/${scheduleId}`, scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error updating schedule:', error);
      throw error;
    }
  },

  async deleteSchedule(scheduleId) {
    try {
      const response = await api.delete(`/admin/schedules/section/${scheduleId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      throw error;
    }
  },

  async getClassrooms() {
    try {
      const response = await api.get('/admin/classrooms');
      return response.data;
    } catch (error) {
      console.error('Error fetching classrooms:', error);
      throw error;
    }
  },

  async addClassroom(classroomData) {
    try {
      const response = await api.post('/admin/classrooms', classroomData);
      return response.data;
    } catch (error) {
      console.error('Error adding classroom:', error);
      throw error;
    }
  },

  async updateClassroom(classroomId, classroomData) {
    try {
      const response = await api.put(`/admin/classrooms/${classroomId}`, classroomData);
      return response.data;
    } catch (error) {
      console.error('Error updating classroom:', error);
      throw error;
    }
  },

  async deleteClassroom(classroomId) {
    try {
      const response = await api.delete(`/admin/classrooms/${classroomId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting classroom:', error);
      throw error;
    }
  },

  async getModules() {
    try {
      const response = await api.get('/admin/modules');
      return response.data;
    } catch (error) {
      console.error('Error fetching modules:', error);
      throw error;
    }
  },

  async addModule(moduleData) {
    try {
      const response = await api.post('/admin/modules', moduleData);
      return response.data;
    } catch (error) {
      console.error('Error adding module:', error);
      throw error;
    }
  },

  async updateModule(moduleId, moduleData) {
    try {
      const response = await api.put(`/admin/modules/${moduleId}`, moduleData);
      return response.data;
    } catch (error) {
      console.error('Error updating module:', error);
      throw error;
    }
  },

  async deleteModule(moduleId) {
    try {
      const response = await api.delete(`/admin/modules/${moduleId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting module:', error);
      throw error;
    }
  }
};

export default ScheduleService; 