import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Upload, FileText, FileSpreadsheet, Calendar, Check, AlertCircle, Plus, Trash2, Edit2, Database } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog"
import { useState, useRef, useEffect } from "react"
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import ScheduleService from '@/services/ScheduleService';
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/ui/table"

export default function Planning() {
  // State for form fields
  const [formData, setFormData] = useState({
    fileType: 'pdf',
    semester: '',
    year: '',
    speciality: '',
    section: ''
  });

  // State for classrooms
  const [classrooms, setClassrooms] = useState([
    {
      id: 1,
      number: "A101",
      name: "Amphitheatre 1",
      type: "SALLE_COURS",
      capacity: 120,
      building: "Building A",
      status: "Available"
    },
    {
      id: 2,
      number: "B203",
      name: "Salle TP 3",
      type: "SALLE_TP",
      capacity: 30,
      building: "Building B",
      status: "Available"
    },
    {
      id: 3,
      number: "C105",
      name: "Salle TD 5",
      type: "SALLE_TD",
      capacity: 45,
      building: "Building C",
      status: "Unavailable"
    }
  ]);

  // State for specialities
  const [specialities, setSpecialities] = useState([]);
  const [filteredSpecialities, setFilteredSpecialities] = useState([]);
  // State for sections
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [isAddSectionDialogOpen, setIsAddSectionDialogOpen] = useState(false);
  const [isEditSectionDialogOpen, setIsEditSectionDialogOpen] = useState(false);
  const [isDeleteSectionDialogOpen, setIsDeleteSectionDialogOpen] = useState(false);
  const [newSection, setNewSection] = useState({
    name: '',
    specialityId: null,
    academicYear: 1
  });
  const [isLoading, setIsLoading] = useState(false);
  const [specialityFile, setSpecialityFile] = useState(null);
  const [isUploadingSpecialities, setIsUploadingSpecialities] = useState(false);

  // State for new/edit classroom form
  const [newClassroom, setNewClassroom] = useState({
    name: '',
    number: '',
    type: 'SALLE_COURS',
    capacity: '',
    floor: '',
    building: ''
  });

  // State for dialog visibility
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedClassroom, setSelectedClassroom] = useState(null);

  // State for schedules
  const [schedules, setSchedules] = useState([
    {
      id: 1,
      module: "CS 101",
      professor: "Dr. Michael Chen",
      day: "MONDAY",
      time: "10:00 - 12:00",
      room: "A101",
      section: "A"
    },
    {
      id: 2,
      module: "MATH 201",
      professor: "Dr. Sarah Johnson",
      day: "WEDNESDAY",
      time: "14:00 - 16:00",
      room: "B203",
      section: "B"
    }
  ]);

  // State for schedule management
  const [newSchedule, setNewSchedule] = useState({
    module: "",
    professor: "",
    day: "MONDAY",
    time: "",
    room: "",
    section: "A"
  });
  const [isAddScheduleDialogOpen, setIsAddScheduleDialogOpen] = useState(false);
  const [isEditScheduleDialogOpen, setIsEditScheduleDialogOpen] = useState(false);
  const [isDeleteScheduleDialogOpen, setIsDeleteScheduleDialogOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // State for modules
  const [modules, setModules] = useState([
    {
      id: 1,
      code: "CS101",
      name: "Introduction to Programming",
      speciality: "Informatique",
      year: 1,
      semester: "SEMESTRE1",
      palier: "LMD"
    },
    {
      id: 2,
      code: "MATH201",
      name: "Calculus I",
      speciality: "Mathématiques",
      year: 2,
      semester: "SEMESTRE2",
      palier: "LMD"
    }
  ]);

  // State for module management
  const [newModule, setNewModule] = useState({
    code: '',
    name: '',
    description: '',
    academicYear: 1,
    semester: 'SEMESTRE1',
    specialityId: null,
    palierId: null,
    yearId: null
  });
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  const [isEditModuleDialogOpen, setIsEditModuleDialogOpen] = useState(false);
  const [isDeleteModuleDialogOpen, setIsDeleteModuleDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  // State for file upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // State for validation
  const [formErrors, setFormErrors] = useState({});

  // Add new state for section schedules
  const [sectionSchedules, setSectionSchedules] = useState([]);
  const [isAddSectionScheduleDialogOpen, setIsAddSectionScheduleDialogOpen] = useState(false);
  const [isEditSectionScheduleDialogOpen, setIsEditSectionScheduleDialogOpen] = useState(false);
  const [isDeleteSectionScheduleDialogOpen, setIsDeleteSectionScheduleDialogOpen] = useState(false);
  const [newSectionSchedule, setNewSectionSchedule] = useState({
    day: 'MONDAY',
    timeSlot: '',
    module: '',
    professor: '',
    room: '',
    type: 'COURSE',
    groups: []
  });

  // Add dummy data for section schedules
  const dummySectionSchedules = [
    {
      id: 1,
      section: 'A',
      speciality: 'Informatique',
      year: 1,
      semester: 'SEMESTRE1',
      day: 'MONDAY',
      timeSlot: '08:00 - 10:00',
      module: 'CS101',
      professor: 'Dr. Smith',
      room: 'A101',
      type: 'COURSE',
      groups: ['G1']
    },
    {
      id: 2,
      section: 'B',
      speciality: 'Informatique',
      year: 1,
      semester: 'SEMESTRE1',
      day: 'WEDNESDAY',
      timeSlot: '10:00 - 12:00',
      module: 'MATH101',
      professor: 'Dr. Johnson',
      room: 'B203',
      type: 'TD',
      groups: ['G2']
    }
  ];

  // Add new state for processing logs
  const [processingLogs, setProcessingLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');

  // Add this function to handle logging
  const addProcessingLog = (message, type = 'info') => {
    setProcessingLogs(prev => [...prev, { message, type, timestamp: new Date().toISOString() }]);
  };

  // Fetch specialities on component mount
  useEffect(() => {
    const fetchSpecialities = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          toast.error('Please log in to access this feature');
          return;
        }

        const response = await api.get('/admin/specialities', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.data.success) {
          console.log('All specialities:', response.data.specialities);
          setSpecialities(response.data.specialities);
          setFilteredSpecialities(response.data.specialities);
        } else {
          console.error('Failed to fetch specialities:', response.data.message);
          toast.error(response.data.message || 'Failed to load specialities');
        }
      } catch (error) {
        console.error('Error fetching specialities:', error);
        if (error.response?.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          // Redirect to login page
          window.location.href = '/login';
        } else {
          toast.error('Failed to load specialities. Please try again later.');
        }
        setSpecialities([]);
        setFilteredSpecialities([]);
      }
    };
    fetchSpecialities();
  }, []);

  useEffect(() => {
    if (formData.year) {
      const yearNumber = parseInt(formData.year);
      console.log('Filtering for year:', yearNumber);
  
      // Filter specialties based on year
      const filtered = specialities.filter(speciality => {
        const name = speciality.name.toUpperCase().replace(/ /g, ''); // Normalize name
        let targetCodes = [];
  
        // Years 1-3: Match L1/L2/L3, Licence1/Licence2/Licence3, or ING1/ING2/ING3
        if (yearNumber >= 1 && yearNumber <= 3) {
          targetCodes.push(
            `L${yearNumber}`, 
            `LICENCE${yearNumber}`,
            `ING${yearNumber}`
          );
        } 
        // Years 4-5: Match M1/M2
        else if (yearNumber === 4 || yearNumber === 5) {
          const masterYear = yearNumber - 3; // 4 → M1, 5 → M2
          targetCodes.push(`M${masterYear}`);
        }
  
        // Check for matches
        return targetCodes.some(code => name.includes(code));
      });
  
      // Deduplicate specialties by name
      const uniqueNames = new Set();
      const dedupedFiltered = filtered.filter(speciality => {
        if (!uniqueNames.has(speciality.name)) {
          uniqueNames.add(speciality.name);
          return true;
        }
        return false;
      });
  
      console.log('Filtered specialties:', dedupedFiltered);
      setFilteredSpecialities(dedupedFiltered);
    } else {
      setFilteredSpecialities(specialities);
    }
  }, [formData.year, specialities]);

  // Fetch sections based on selected speciality and year
  useEffect(() => {
    const fetchSections = async () => {
      if (!formData.speciality || !formData.year) {
        // Reset sections if speciality or year is not selected
        // setSections([]); // Assuming a sections state variable exists or will be added
        // setSelectedSection('');
        return;
      }
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }
        // TODO: Implement backend endpoint to fetch sections by speciality and year
        // For now, using dummy sections
        console.log(`Fetching sections for speciality: ${formData.speciality}, year: ${formData.year}`);
        // Example: const response = await api.get(`/admin/sections?speciality=${formData.speciality}&year=${formData.year}`, {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // });
        // if (response.data.success) {
        //   setSections(response.data.sections);
        // } else {
        //   console.error('Failed to fetch sections:', response.data.message);
        // }
      } catch (error) {
        console.error('Error fetching sections:', error);
      }
    };
    fetchSections();
  }, [formData.speciality, formData.year]);

  // Fetch section schedules based on selected section, speciality, year, and semester
  useEffect(() => {
    const fetchSectionSchedules = async () => {
      if (!formData.section || !formData.speciality || !formData.year || !formData.semester) {
        toast.error('Please select all required fields');
        return;
      }

      try {
        // Convert year to number and ensure it's a valid value
        const yearNumber = parseInt(formData.year);
        if (isNaN(yearNumber) || yearNumber < 1 || yearNumber > 5) {
          toast.error('Invalid year selected');
          return;
        }

        // Log request parameters
        console.log('Fetching schedules with params:', {
          section: formData.section,
          speciality: formData.speciality,
          year: yearNumber,
          semester: formData.semester
        });

        const response = await api.get('/admin/schedules/section', {
          params: {
            section: formData.section,
            speciality: formData.speciality.replace(/\+/g, ' '),
            year: yearNumber,
            semester: formData.semester
          }
        });

        if (response.data.success) {
          setSectionSchedules(response.data.scheduleSlots || []);
          console.log('Received schedule data:', response.data.scheduleSlots);
        } else {
          toast.error(response.data.message || 'Failed to fetch schedules');
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        const errorMessage = error.response?.data?.message || 'Failed to fetch schedules';
        toast.error(errorMessage);
      }
    };
    fetchSectionSchedules();
  }, [formData.section, formData.speciality, formData.year, formData.semester]);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClassroom(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle adding new classroom
  const handleAddClassroom = async () => {
    try {
      if (!newClassroom.name || !newClassroom.number || !newClassroom.type) {
        toast.error('Please fill in all required fields');
        return;
      }

      const response = await api.post('/admin/classrooms', {
        ...newClassroom,
        capacity: parseInt(newClassroom.capacity) || null,
        floor: parseInt(newClassroom.floor) || null
      });

      if (response.data.success) {
        toast.success('Classroom added successfully');
        setClassrooms(prev => [...prev, response.data.data]);
        setNewClassroom({
          name: '',
          number: '',
          type: 'SALLE_COURS',
          capacity: '',
          floor: '',
          building: ''
        });
        setIsAddDialogOpen(false);
      } else {
        toast.error(response.data.message || 'Failed to add classroom');
      }
    } catch (error) {
      console.error('Error adding classroom:', error);
      toast.error(error.response?.data?.message || 'Failed to add classroom');
    }
  };

  // Handle editing classroom
  const handleEditClassroom = async () => {
    try {
      const response = await api.put(`/admin/classrooms/${selectedClassroom.id}`, selectedClassroom);
      if (response.data.success) {
        toast.success('Classroom updated successfully');
        setClassrooms(prev => prev.map(room => 
          room.id === selectedClassroom.id ? response.data.data : room
        ));
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating classroom:', error);
      toast.error(error.response?.data?.message || 'Failed to update classroom');
    }
  };

  // Handle deleting classroom
  const handleDeleteClassroom = async () => {
    try {
      const response = await api.delete(`/admin/classrooms/${selectedClassroom.id}`);
      if (response.data.success) {
        toast.success('Classroom deleted successfully');
        setClassrooms(prev => prev.filter(room => room.id !== selectedClassroom.id));
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting classroom:', error);
      toast.error(error.response?.data?.message || 'Failed to delete classroom');
    }
  };

  // Handle edit button click
  const handleEditClick = (classroom) => {
    setSelectedClassroom(classroom);
    setIsEditDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteClick = (classroom) => {
    setSelectedClassroom(classroom);
    setIsDeleteDialogOpen(true);
  };

  // Schedule handlers
  const handleAddSchedule = () => {
    const schedule = {
      id: schedules.length + 1,
      ...newSchedule
    };
    setSchedules(prev => [...prev, schedule]);
    setNewSchedule({
      module: "",
      professor: "",
      day: "MONDAY",
      time: "",
      room: "",
      section: "A"
    });
    setIsAddScheduleDialogOpen(false);
  };

  const handleEditSchedule = () => {
    setSchedules(prev => prev.map(schedule => 
      schedule.id === selectedSchedule.id ? { ...selectedSchedule } : schedule
    ));
    setIsEditScheduleDialogOpen(false);
  };

  const handleDeleteSchedule = () => {
    setSchedules(prev => prev.filter(schedule => schedule.id !== selectedSchedule.id));
    setIsDeleteScheduleDialogOpen(false);
  };

  // Module handlers
  const handleAddModule = async () => {
    try {
      if (!newModule.code || !newModule.name || !newModule.specialityId) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Get the selected speciality to find its palier and year
      const selectedSpeciality = specialities.find(s => s.id === newModule.specialityId);
      if (!selectedSpeciality) {
        toast.error('Selected speciality not found');
        return;
      }

      // Format the module data according to backend requirements
      const moduleData = {
        code: newModule.code,
        name: newModule.name,
        description: newModule.description || '',
        academicYear: parseInt(newModule.academicYear),
        semestre: newModule.semester,
        specialityId: parseInt(newModule.specialityId),
        palierId: selectedSpeciality.palierId,
        yearId: selectedSpeciality.yearId
      };

      console.log('Sending module data:', moduleData);

      const response = await api.post('/admin/modules', moduleData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Module added successfully');
        // Add the new module to the list
        setModules(prev => [...prev, response.data.data]);
        // Reset the form
        setNewModule({
          code: '',
          name: '',
          description: '',
          academicYear: 1,
          semester: 'SEMESTRE1',
          specialityId: null,
          palierId: null,
          yearId: null
        });
        setIsAddModuleDialogOpen(false);
      } else {
        toast.error(response.data.message || 'Failed to add module');
      }
    } catch (error) {
      console.error('Error adding module:', error);
      const errorMessage = error.response?.data?.message || 'Failed to add module';
      toast.error(errorMessage);
    }
  };

  const handleEditModule = () => {
    setModules(prev => prev.map(module => 
      module.id === selectedModule.id ? { ...selectedModule } : module
    ));
    setIsEditModuleDialogOpen(false);
  };

  const handleDeleteModule = () => {
    setModules(prev => prev.filter(module => module.id !== selectedModule.id));
    setIsDeleteModuleDialogOpen(false);
  };

  // Update file upload handler to handle DOCX, PDF, and Excel files
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log('Selected file details:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // Check file extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!['docx', 'pdf', 'xlsx', 'xls'].includes(fileExtension)) {
        setError('Please upload a .docx, .pdf, or Excel (.xlsx/.xls) file');
        setSelectedFile(null);
        return;
      }

      // Update formData with the correct file type
      setFormData(prev => ({
        ...prev,
        fileType: fileExtension
      }));

      // Check MIME type
      const validMimeTypes = {
        'docx': [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/octet-stream'
        ],
        'pdf': ['application/pdf'],
        'xlsx': [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/octet-stream'
        ],
        'xls': [
          'application/vnd.ms-excel',
          'application/octet-stream'
        ]
      };

      if (!validMimeTypes[fileExtension].includes(file.type)) {
        console.warn('File MIME type:', file.type);
        // Don't reject the file just based on MIME type as it can be unreliable
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  // Update file input accept attribute based on selected file type
  useEffect(() => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = `.${formData.fileType}`;
    }
  }, [formData.fileType]);

  // Add form field change handler
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field when it changes
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
    // Reset section when speciality or year changes
    if (field === 'speciality' || field === 'year') {
      setFormData(prev => ({
        ...prev,
        section: ''
      }));
    }
  };

  // Add validation function
  const validateForm = () => {
    const errors = {};
    if (!formData.semester) errors.semester = 'Semester is required';
    if (!formData.year) errors.year = 'Year is required';
    if (!formData.speciality) errors.speciality = 'Speciality is required';
    if (!formData.section) errors.section = 'Section is required';
    if (!selectedFile) errors.file = 'Please select a file';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update handleProcessFile to use the correct endpoint based on file type
  const handleProcessFile = async () => {
    try {
      setIsProcessing(true);
      addProcessingLog('Starting file processing...', 'info');

      if (!selectedFile) {
        addProcessingLog('No file selected', 'error');
        toast.error('Please select a file first');
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('file', selectedFile);
      formDataToSend.append('fileType', formData.fileType);

      addProcessingLog(`Uploading ${formData.fileType.toUpperCase()} file...`, 'info');

      // Determine the endpoint based on file type
      let endpoint = 'admin/extract-schedule';
      if (formData.fileType === 'xlsx' || formData.fileType === 'xls') {
        endpoint = 'admin/extract-excel';
      } else if (formData.fileType === 'pdf') {
        endpoint = 'admin/extract-pdf';
      }

      const response = await api.post(
        endpoint,
        formDataToSend,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Server response:', response.data);

      if (response.data.success) {
        // Use the database-ready format if available, otherwise use the regular data
        const scheduleData = response.data.databaseReady || response.data.data;
        console.log('Extracted data:', scheduleData);
        
        setExtractedData({
          success: true,
          data: scheduleData
        });

        addProcessingLog(`Successfully processed ${formData.fileType.toUpperCase()} file`, 'success');
        addProcessingLog(`Found ${scheduleData.scheduleEntries?.length || 0} schedule entries`, 'info');
        
        if (scheduleData.headerInfo) {
          addProcessingLog('Header Information:', 'info');
          Object.entries(scheduleData.headerInfo).forEach(([key, value]) => {
            if (value) addProcessingLog(`${key}: ${value}`, 'info');
          });
        }

        // Switch to preview tab
        setActiveTab('preview');
      } else {
        addProcessingLog(`Error: ${response.data.error}`, 'error');
        toast.error(response.data.error || 'Failed to process file');
      }
    } catch (error) {
      console.error('Error processing file:', error);
      addProcessingLog(`Error: ${error.response?.data?.error || error.message}`, 'error');
      toast.error(error.response?.data?.error || 'Failed to process file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Add click handler for the Browse Files button
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Update handleFinalizeImport function
  const handleFinalizeImport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access this feature');
        return;
      }

      if (!formData.speciality || !formData.year || !formData.semester || !formData.section) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (!extractedData?.data?.scheduleEntries || extractedData.data.scheduleEntries.length === 0) {
        toast.error('No schedule entries found to import');
        return;
      }

      // Find the section in the database
      const section = sections.find(s => 
        s.name === formData.section && 
        s.specialityId === parseInt(formData.speciality) &&
        s.academicYear === parseInt(formData.year)
      );

      if (!section) {
        toast.error('Selected section not found in database');
        return;
      }

      // Format the schedule data
      const scheduleData = {
        sectionId: section.id,
        specialityName: formData.speciality,
        academicYear: parseInt(formData.year),
        semester: formData.semester,
        scheduleEntries: extractedData.data.scheduleEntries.map(entry => ({
          dayOfWeek: entry.dayOfWeek,
          startTime: entry.startTime,
          endTime: entry.endTime,
          moduleName: entry.moduleName,
          professorName: entry.professorName,
          roomNumber: entry.roomNumber,
          roomType: entry.roomType || 'COURSE',
          groups: entry.groups || []
        }))
      };

      console.log('Sending schedule data:', scheduleData);

      const response = await api.post('/admin/schedules/section/bulk', scheduleData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Schedule imported successfully');
        setExtractedData(null);
        setActiveTab('section-schedules');
        
        // Refresh the schedules list
        const updatedResponse = await api.get('/admin/schedules/section', {
          params: {
            section: formData.section,
            speciality: formData.speciality,
            year: parseInt(formData.year),
            semester: formData.semester
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (updatedResponse.data.success) {
          setSectionSchedules(updatedResponse.data.scheduleSlots);
        }
      } else {
        toast.error(response.data.message || 'Failed to import schedule');
      }
    } catch (error) {
      console.error('Error importing schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to import schedule');
    }
  };

  // Add handler for speciality file upload
  const handleSpecialityFileUpload = async () => {
    if (!specialityFile) {
      toast.error('Please select a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', specialityFile);

    try {
      setIsUploadingSpecialities(true);
      const response = await api.post('/admin/import-specialities', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Specialities imported successfully');
        // Refresh specialities list
        const specialitiesResponse = await api.get('/admin/specialities', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        if (specialitiesResponse.data.success) {
          setSpecialities(specialitiesResponse.data.specialities);
        }
      } else {
        toast.error(response.data.message || 'Failed to import specialities');
      }
    } catch (error) {
      console.error('Error uploading specialities:', error);
      const errorMessage = error.response?.data?.message || 'Failed to import specialities';
      toast.error(errorMessage);
    } finally {
      setIsUploadingSpecialities(false);
      setSpecialityFile(null);
    }
  };

  // Add new handler functions
  const handleAddSectionSchedule = async () => {
    if (!selectedSection || !formData.speciality || !formData.year || !formData.semester) {
      toast.error('Please select a section, speciality, year, and semester first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access this feature');
        return;
      }

      const payload = {
        section: selectedSection,
        speciality: formData.speciality,
        year: parseInt(formData.year),
        semester: formData.semester,
        day: newSectionSchedule.day,
        timeSlot: newSectionSchedule.timeSlot,
        module: newSectionSchedule.module,
        professor: newSectionSchedule.professor,
        room: newSectionSchedule.room,
        type: newSectionSchedule.type,
        groups: newSectionSchedule.groups,
      };

      const response = await api.post('/admin/schedules/section', payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Schedule added successfully');
        setIsAddSectionScheduleDialogOpen(false);
        setNewSectionSchedule({
          day: 'MONDAY',
          timeSlot: '',
          module: '',
          professor: '',
          room: '',
          type: 'COURSE',
          groups: []
        });
        // Refresh the schedules list
        const updatedResponse = await api.get('/admin/schedules/section', {
          params: {
            section: selectedSection,
            speciality: formData.speciality,
            year: formData.year,
            semester: formData.semester
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (updatedResponse.data.success) {
          setSectionSchedules(updatedResponse.data.scheduleSlots);
        }
      } else {
        toast.error(response.data.message || 'Failed to add schedule');
      }
    } catch (error) {
      console.error('Error adding section schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to add schedule');
    }
  };

  // Handler to open edit dialog and populate form
  const handleEditSectionScheduleClick = (schedule) => {
    // Map the schedule data back to the form state structure
    setNewSectionSchedule({
      id: schedule.id,
      day: schedule.day,
      timeSlot: schedule.timeSlot,
      module: schedule.module, // This might need mapping if module is ID in state but name in table
      professor: schedule.professor,
      room: schedule.room, // This might need mapping if room is ID in state but number in table
      type: schedule.type,
      groups: schedule.groups,
    });
    setIsEditSectionScheduleDialogOpen(true);
  };

  // Handler to perform the edit
  const handleEditSectionSchedule = async () => {
    if (!newSectionSchedule.id) {
      toast.error('No schedule selected for editing');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access this feature');
        return;
      }

      const payload = {
        day: newSectionSchedule.day,
        timeSlot: newSectionSchedule.timeSlot,
        module: newSectionSchedule.module,
        professor: newSectionSchedule.professor,
        room: newSectionSchedule.room,
        type: newSectionSchedule.type,
        groups: newSectionSchedule.groups,
      };

      const response = await api.put(`/admin/schedules/section/${newSectionSchedule.id}`, payload, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        toast.success('Schedule updated successfully');
        setIsEditSectionScheduleDialogOpen(false);
        setNewSectionSchedule({
          day: 'MONDAY',
          timeSlot: '',
          module: '',
          professor: '',
          room: '',
          type: 'COURSE',
          groups: []
        });
        // Refresh the schedules list
        const updatedResponse = await api.get('/admin/schedules/section', {
          params: {
            section: selectedSection,
            speciality: formData.speciality,
            year: formData.year,
            semester: formData.semester
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (updatedResponse.data.success) {
          setSectionSchedules(updatedResponse.data.scheduleSlots);
        }
      } else {
        toast.error(response.data.message || 'Failed to update schedule');
      }
    } catch (error) {
      console.error('Error updating section schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to update schedule');
    }
  };

  // Handler to open delete dialog and store selected schedule
  const handleDeleteSectionScheduleClick = (schedule) => {
    setSelectedSchedule(schedule); // Use selectedSchedule state for delete confirmation
    setIsDeleteSectionScheduleDialogOpen(true);
  };

  // Handler to perform the delete
  const handleDeleteSectionSchedule = async () => {
    if (!selectedSchedule?.id) {
      toast.error('No schedule selected for deletion');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access this feature');
        return;
      }

      const response = await api.delete(`/admin/schedules/section/${selectedSchedule.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data.success) {
        toast.success('Schedule deleted successfully');
        setIsDeleteSectionScheduleDialogOpen(false);
        setSelectedSchedule(null);
        // Refresh the schedules list
        const updatedResponse = await api.get('/admin/schedules/section', {
          params: {
            section: selectedSection,
            speciality: formData.speciality,
            year: formData.year,
            semester: formData.semester
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (updatedResponse.data.success) {
          setSectionSchedules(updatedResponse.data.scheduleSlots);
        }
      } else {
        toast.error(response.data.message || 'Failed to delete schedule');
      }
    } catch (error) {
      console.error('Error deleting section schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to delete schedule');
    }
  };

  // Add this useEffect near the other useEffect hooks
  useEffect(() => {
    const fetchSchedules = async () => {
      if (!formData.section || !formData.speciality || !formData.year || !formData.semester) {
        console.log('Missing required fields:', {
          section: formData.section,
          speciality: formData.speciality,
          year: formData.year,
          semester: formData.semester
        });
        return;
      }

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.error('No authentication token found');
          return;
        }

        console.log('Fetching schedules with params:', {
          section: formData.section,
          speciality: formData.speciality,
          year: formData.year,
          semester: formData.semester
        });

        const response = await api.get('/admin/schedules/section', {
          params: {
            section: formData.section,
            speciality: formData.speciality.replace(/\+/g, ' '),
            year: parseInt(formData.year),
            semester: formData.semester
          },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('API Response:', response.data);

        if (response.data.success) {
          const schedules = response.data.scheduleSlots || [];
          console.log('Setting schedules:', schedules);
          console.log('Schedule structure:', schedules.map(s => ({
            id: s.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            module: s.module,
            owner: s.owner,
            room: s.room
          })));
          setSectionSchedules(schedules);
        } else {
          console.error('Failed to fetch schedules:', response.data.message);
          toast.error(response.data.message || 'Failed to fetch schedules');
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        console.error('Error details:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        toast.error(error.response?.data?.message || 'Failed to fetch schedules');
      }
    };

    fetchSchedules();
  }, [formData.section, formData.speciality, formData.year, formData.semester]);

  // Fetch classrooms on component mount
  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        const response = await api.get('/admin/classrooms');
        if (response.data.success) {
          setClassrooms(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching classrooms:', error);
        toast.error('Failed to fetch classrooms');
      }
    };

    fetchClassrooms();
  }, []);

  // Add useEffect to fetch schedules when filters change
  useEffect(() => {
    const fetchSchedules = async () => {
      if (selectedSection && formData.speciality && formData.year && formData.semester) {
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            toast.error('Please log in to access this feature');
            return;
          }

          console.log('Fetching schedules with params:', {
            section: selectedSection,
            speciality: formData.speciality,
            year: formData.year,
            semester: formData.semester
          });

          const response = await api.get('/admin/schedules/section', {
            params: {
              section: selectedSection,
              speciality: formData.speciality,
              year: formData.year,
              semester: formData.semester
            },
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          console.log('API Response:', response.data);

          if (response.data.success) {
            console.log('Setting schedules:', response.data.scheduleSlots);
            setSectionSchedules(response.data.scheduleSlots);
          } else {
            console.error('Failed to fetch schedules:', response.data.message);
            toast.error(response.data.message || 'Failed to fetch schedules');
          }
        } catch (error) {
          console.error('Error fetching schedules:', error);
          console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
          });
          toast.error(error.response?.data?.message || 'Failed to fetch schedules');
        }
      } else {
        console.log('Missing required fields:', {
          selectedSection,
          speciality: formData.speciality,
          year: formData.year,
          semester: formData.semester
        });
      }
    };

    fetchSchedules();
  }, [selectedSection, formData.speciality, formData.year, formData.semester]);

  // Section management functions
  const fetchSections = async () => {
    try {
      const response = await api.get('/admin/sections');
      if (response.data.success) {
        setSections(response.data.sections);
      } else {
        toast.error(response.data.message || 'Failed to fetch sections');
      }
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to fetch sections');
    }
  };

  const handleAddSection = async () => {
    try {
      if (!newSection.name || !newSection.specialityId || !newSection.academicYear) {
        toast.error('Please fill in all required fields');
        return;
      }

      const response = await api.post('/admin/sections', {
        name: newSection.name,
        specialityId: parseInt(newSection.specialityId),
        academicYear: parseInt(newSection.academicYear)
      });
      
      if (response.data.success) {
        toast.success('Section added successfully');
        setSections(prev => [...prev, response.data.data]);
        setIsAddSectionDialogOpen(false);
        setNewSection({ 
          name: '', 
          specialityId: null,
          academicYear: 1
        });
      } else {
        toast.error(response.data.message || 'Failed to add section');
      }
    } catch (error) {
      console.error('Error adding section:', error);
      toast.error(error.response?.data?.message || 'Failed to add section');
    }
  };

  const handleEditSection = async () => {
    if (!selectedSection) return;
    try {
      const response = await api.put(`/admin/sections/${selectedSection.id}`, {
        name: newSection.name,
        specialityId: parseInt(newSection.specialityId),
        academicYear: parseInt(newSection.academicYear)
      });
      
      if (response.data.success) {
        setSections(prev => prev.map(section => 
          section.id === selectedSection.id ? response.data.section : section
        ));
        setIsEditSectionDialogOpen(false);
        setSelectedSection(null);
        setNewSection({ 
          name: '', 
          specialityId: null,
          academicYear: 1
        });
        toast.success('Section updated successfully');
      } else {
        toast.error(response.data.message || 'Failed to update section');
      }
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error(error.response?.data?.message || 'Failed to update section');
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSection) return;
    try {
      const response = await api.delete(`/admin/sections/${selectedSection.id}`);
      if (response.data.success) {
        setSections(prev => prev.filter(section => section.id !== selectedSection.id));
        setIsDeleteSectionDialogOpen(false);
        setSelectedSection(null);
        toast.success('Section deleted successfully');
      } else {
        toast.error(response.data.message || 'Failed to delete section');
      }
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  const handleEditSectionClick = (section) => {
    setSelectedSection(section);
    setNewSection({
      name: section.name,
      specialityId: section.specialityId,
      academicYear: section.academicYear
    });
    setIsEditSectionDialogOpen(true);
  };

  const handleDeleteSectionClick = (section) => {
    setSelectedSection(section);
    setIsDeleteSectionDialogOpen(true);
  };

  useEffect(() => {
    fetchSections();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planning Management</h1>
        <Button className="bg-emerald-600 hover:bg-emerald-700">
          <Calendar className="h-4 w-4 mr-2" />
          View Current Schedule
        </Button>
      </div>

      <Tabs defaultValue="upload">
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="upload">Upload Schedule</TabsTrigger>
          <TabsTrigger value="preview">Preview & Validate</TabsTrigger>
          <TabsTrigger value="history">Upload History</TabsTrigger>
          <TabsTrigger value="specialities">Specialities</TabsTrigger>
          <TabsTrigger value="section-schedules">Section Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Upload Schedule Files</CardTitle>
              <CardDescription>Upload PDF or Excel files containing the university schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="semester">Semester</Label>
                    <Select
                      value={formData.semester}
                      onValueChange={(value) => handleFormChange('semester', value)}
                    >
                      <SelectTrigger id="semester" className="w-full">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SEMESTRE1">Semester 1</SelectItem>
                        <SelectItem value="SEMESTRE2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.semester && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.semester}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => handleFormChange('year', value)}
                    >
                      <SelectTrigger id="year" className="w-full">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">First Year</SelectItem>
                        <SelectItem value="2">Second Year</SelectItem>
                        <SelectItem value="3">Third Year</SelectItem>
                        <SelectItem value="4">Fourth Year</SelectItem>
                        <SelectItem value="5">Fifth Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.year && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.year}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="speciality">Specialité</Label>
                    <Select
                      value={formData.speciality}
                      onValueChange={(value) => handleFormChange('speciality', value)}
                    >
                      <SelectTrigger id="speciality" className="w-full">
                        <SelectValue placeholder="Select speciality" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSpecialities.map((speciality) => (
                          <SelectItem key={speciality.id} value={speciality.name}>
                            {speciality.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.speciality && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.speciality}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="section">Section</Label>
                    <Select
                      value={formData.section}
                      onValueChange={(value) => handleFormChange('section', value)}
                    >
                      <SelectTrigger id="section" className="w-full">
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((section) => (
                          <SelectItem key={section} value={section}>
                            Section {section}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.section && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.section}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="file-type">File Type</Label>
                    <Select 
                      value={formData.fileType}
                      onValueChange={(value) => handleFormChange('fileType', value)}
                    >
                      <SelectTrigger id="file-type" className="w-full">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="docx">Word Document</SelectItem>
                        <SelectItem value="pdf">PDF Document</SelectItem>
                        <SelectItem value="xlsx">Excel Document</SelectItem>
                        <SelectItem value="xls">Excel Document (Legacy)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-emerald-50 p-3">
                    <Upload className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Drag & Drop Files</h3>
                  <p className="text-sm text-gray-500 mb-4">or click to browse your files</p>
                  <div className="flex gap-2 mb-4">
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 flex items-center">
                      <FileText className="h-3 w-3 mr-1" /> DOCX
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 flex items-center">
                      <FileText className="h-3 w-3 mr-1" /> PDF
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".docx,.pdf,.xlsx,.xls"
                    className="hidden"
                    disabled={!formData.semester || !formData.year || !formData.speciality || !formData.section}
                  />
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleBrowseClick}
                    disabled={isProcessing || !formData.semester || !formData.year || !formData.speciality || !formData.section}
                  >
                    {isProcessing ? 'Processing...' : 'Browse Files'}
                  </Button>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700">{selectedFile.name}</span>
                    </div>
                  )}
                  {formErrors.file && (
                    <p className="text-sm text-red-500 mt-2">{formErrors.file}</p>
                  )}
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-700">{error}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-lg border p-4 bg-blue-50 text-blue-800 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">File Processing Information</h4>
                  <p className="text-sm mt-1">
                    Our system will automatically extract schedule information from your uploaded Word documents. The processing may
                    take a few minutes depending on the file size and complexity.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setSelectedFile(null);
                setFormData({
                  semester: '',
                  year: '',
                  speciality: '',
                  section: '',
                  fileType: 'docx'
                });
                setFormErrors({});
                setError(null);
              }}>Cancel</Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={handleProcessFile}
                disabled={isProcessing || !selectedFile}
              >
                {isProcessing ? 'Processing...' : 'Upload & Process'}
              </Button>
            </CardFooter>
          </Card>

          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Modify Schedule Components</CardTitle>
              <CardDescription>Manage classrooms, schedules, and modules</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="classrooms">
                <TabsList className="grid w-full grid-cols-4 mb-6">
                  <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
                  <TabsTrigger value="schedules">Schedules</TabsTrigger>
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                  <TabsTrigger value="sections">Sections</TabsTrigger>
                </TabsList>

                <TabsContent value="classrooms" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Classroom Management</h3>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <Plus className="h-4 w-4" />
                          Add Classroom
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Classroom</DialogTitle>
                          <DialogDescription>
                            Create a new classroom with its details
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                              id="name"
                              value={newClassroom.name}
                              onChange={(e) => setNewClassroom(prev => ({ ...prev, name: e.target.value }))}
                              className="col-span-3"
                              placeholder="e.g., Amphitheatre 1"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="number" className="text-right">Room Number</Label>
                            <Input
                              id="number"
                              value={newClassroom.number}
                              onChange={(e) => setNewClassroom(prev => ({ ...prev, number: e.target.value }))}
                              className="col-span-3"
                              placeholder="e.g., A101"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select
                              value={newClassroom.type}
                              onValueChange={(value) => setNewClassroom(prev => ({ ...prev, type: value }))}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SALLE_COURS">Lecture Room</SelectItem>
                                <SelectItem value="SALLE_TP">Lab Room</SelectItem>
                                <SelectItem value="SALLE_TD">Tutorial Room</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="capacity" className="text-right">Capacity</Label>
                            <Input
                              id="capacity"
                              type="number"
                              value={newClassroom.capacity}
                              onChange={(e) => setNewClassroom(prev => ({ ...prev, capacity: e.target.value }))}
                              className="col-span-3"
                              placeholder="Enter room capacity"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="floor" className="text-right">Floor</Label>
                            <Input
                              id="floor"
                              type="number"
                              value={newClassroom.floor}
                              onChange={(e) => setNewClassroom(prev => ({ ...prev, floor: e.target.value }))}
                              className="col-span-3"
                              placeholder="Enter floor number"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="building" className="text-right">Building</Label>
                            <Input
                              id="building"
                              value={newClassroom.building}
                              onChange={(e) => setNewClassroom(prev => ({ ...prev, building: e.target.value }))}
                              className="col-span-3"
                              placeholder="Enter building name"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddClassroom}>Add Classroom</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Room Number</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Capacity</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classrooms.map((room) => (
                          <tr key={room.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{room.number}</td>
                            <td className="px-4 py-3">{room.type}</td>
                            <td className="px-4 py-3">{room.capacity}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                room.status === "Available" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                              }`}>
                                {room.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-emerald-600"
                                      onClick={() => handleEditClick(room)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Edit Classroom</DialogTitle>
                                      <DialogDescription>
                                        Modify the classroom details.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedClassroom && (
                                      <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-number" className="text-right">Room Number</Label>
                                          <Input
                                            id="edit-number"
                                            value={selectedClassroom.number}
                                            onChange={(e) => setSelectedClassroom(prev => ({ ...prev, number: e.target.value }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-type" className="text-right">Type</Label>
                                          <Select
                                            value={selectedClassroom.type}
                                            onValueChange={(value) => setSelectedClassroom(prev => ({ ...prev, type: value }))}
                                          >
                                            <SelectTrigger className="col-span-3 w-full">
                                              <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="SALLE_COURS">Salle de Cours</SelectItem>
                                              <SelectItem value="SALLE_TP">Salle TP</SelectItem>
                                              <SelectItem value="SALLE_TD">Salle TD</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-capacity" className="text-right">Capacity</Label>
                                          <Input
                                            id="edit-capacity"
                                            type="number"
                                            value={selectedClassroom.capacity}
                                            onChange={(e) => setSelectedClassroom(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                      <Button onClick={handleEditClassroom}>Save Changes</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-red-600"
                                      onClick={() => handleDeleteClick(room)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Delete Classroom</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete this classroom? This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedClassroom && (
                                      <div className="py-4">
                                        <p className="text-sm text-gray-500">
                                          You are about to delete classroom {selectedClassroom.number}.
                                        </p>
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                                      <Button variant="destructive" onClick={handleDeleteClassroom}>Delete</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="schedules" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Schedule Management</h3>
                    <Dialog open={isAddScheduleDialogOpen} onOpenChange={setIsAddScheduleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Schedule
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Add New Schedule</DialogTitle>
                          <DialogDescription>
                            Fill in the schedule details.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="module" className="text-right">Module</Label>
                            <Select
                              value={newSchedule.module}
                              onValueChange={(value) => setNewSchedule(prev => ({ ...prev, module: value }))}
                            >
                              <SelectTrigger className="col-span-3 w-full">
                                <SelectValue placeholder="Select module" />
                              </SelectTrigger>
                              <SelectContent>
                                {modules.map((module) => (
                                  <SelectItem key={module.id} value={module.code}>
                                    {module.code} - {module.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="professor" className="text-right">Professor</Label>
                            <Select
                              value={newSchedule.professor}
                              onValueChange={(value) => setNewSchedule(prev => ({ ...prev, professor: value }))}
                            >
                              <SelectTrigger className="col-span-3 w-full">
                                <SelectValue placeholder="Select professor" />
                              </SelectTrigger>
                              <SelectContent>
                                {modules
                                  .filter(module => module.code === newSchedule.module)
                                  .flatMap(module => module.professors)
                                  .map((professor, index) => (
                                    <SelectItem key={index} value={professor.name}>
                                      {professor.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="day" className="text-right">Day</Label>
                            <Select
                              value={newSchedule.day}
                              onValueChange={(value) => setNewSchedule(prev => ({ ...prev, day: value }))}
                            >
                              <SelectTrigger className="col-span-3 w-full">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MONDAY">Monday</SelectItem>
                                <SelectItem value="TUESDAY">Tuesday</SelectItem>
                                <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                                <SelectItem value="THURSDAY">Thursday</SelectItem>
                                <SelectItem value="FRIDAY">Friday</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">Time</Label>
                            <Input
                              id="time"
                              value={newSchedule.time}
                              onChange={(e) => setNewSchedule(prev => ({ ...prev, time: e.target.value }))}
                              className="col-span-3"
                              placeholder="e.g., 10:00 - 12:00"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="room" className="text-right">Room</Label>
                            <Select
                              value={newSchedule.room}
                              onValueChange={(value) => setNewSchedule(prev => ({ ...prev, room: value }))}
                            >
                              <SelectTrigger className="col-span-3 w-full">
                                <SelectValue placeholder="Select room" />
                              </SelectTrigger>
                              <SelectContent>
                                {classrooms
                                  .filter(room => room.status === "Available")
                                  .map((room) => (
                                    <SelectItem key={room.id} value={room.number}>
                                      {room.number} ({room.type})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="section" className="text-right">Section</Label>
                            <Select
                              value={newSchedule.section}
                              onValueChange={(value) => setNewSchedule(prev => ({ ...prev, section: value }))}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select section" />
                              </SelectTrigger>
                              <SelectContent>
                                {modules
                                  .find(module => module.code === newSchedule.module)
                                  ?.sections.map((section) => (
                                    <SelectItem key={section.id} value={section.name}>
                                      {section.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddScheduleDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddSchedule}>Add Schedule</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Professor</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Day</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Section</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {schedules.map((schedule) => (
                          <tr key={schedule.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{schedule.module}</td>
                            <td className="px-4 py-3">{schedule.professor}</td>
                            <td className="px-4 py-3">{schedule.day}</td>
                            <td className="px-4 py-3">{schedule.time}</td>
                            <td className="px-4 py-3">{schedule.room}</td>
                            <td className="px-4 py-3">{schedule.section}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Dialog open={isEditScheduleDialogOpen} onOpenChange={setIsEditScheduleDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-emerald-600"
                                      onClick={() => setSelectedSchedule(schedule)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Edit Schedule</DialogTitle>
                                      <DialogDescription>
                                        Modify the schedule details.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedSchedule && (
                                      <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-module" className="text-right">Module</Label>
                                          <Input
                                            id="edit-module"
                                            value={selectedSchedule.module}
                                            onChange={(e) => setSelectedSchedule(prev => ({ ...prev, module: e.target.value }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-professor" className="text-right">Professor</Label>
                                          <Input
                                            id="edit-professor"
                                            value={selectedSchedule.professor}
                                            onChange={(e) => setSelectedSchedule(prev => ({ ...prev, professor: e.target.value }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-day" className="text-right">Day</Label>
                                          <Select
                                            value={selectedSchedule.day}
                                            onValueChange={(value) => setSelectedSchedule(prev => ({ ...prev, day: value }))}
                                          >
                                            <SelectTrigger className="col-span-3 w-full">
                                              <SelectValue placeholder="Select day" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="MONDAY">Monday</SelectItem>
                                              <SelectItem value="TUESDAY">Tuesday</SelectItem>
                                              <SelectItem value="WEDNESDAY">Wednesday</SelectItem>
                                              <SelectItem value="THURSDAY">Thursday</SelectItem>
                                              <SelectItem value="FRIDAY">Friday</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-time" className="text-right">Time</Label>
                                          <Input
                                            id="edit-time"
                                            value={selectedSchedule.time}
                                            onChange={(e) => setSelectedSchedule(prev => ({ ...prev, time: e.target.value }))}
                                            className="col-span-3"
                                            placeholder="e.g., 10:00 - 12:00"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-room" className="text-right">Room</Label>
                                          <Input
                                            id="edit-room"
                                            value={selectedSchedule.room}
                                            onChange={(e) => setSelectedSchedule(prev => ({ ...prev, room: e.target.value }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-section" className="text-right">Section</Label>
                                          <Select
                                            value={selectedSchedule.section}
                                            onValueChange={(value) => setSelectedSchedule(prev => ({ ...prev, section: value }))}
                                          >
                                            <SelectTrigger className="col-span-3">
                                              <SelectValue placeholder="Select section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="A">Section A</SelectItem>
                                              <SelectItem value="B">Section B</SelectItem>
                                              <SelectItem value="C">Section C</SelectItem>
                                              <SelectItem value="D">Section D</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsEditScheduleDialogOpen(false)}>Cancel</Button>
                                      <Button onClick={handleEditSchedule}>Save Changes</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={isDeleteScheduleDialogOpen} onOpenChange={setIsDeleteScheduleDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-red-600"
                                      onClick={() => setSelectedSchedule(schedule)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Delete Schedule</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete this schedule? This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedSchedule && (
                                      <div className="py-4">
                                        <p className="text-sm text-gray-500">
                                          You are about to delete the schedule for {selectedSchedule.module} ({selectedSchedule.day} {selectedSchedule.time}).
                                        </p>
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsDeleteScheduleDialogOpen(false)}>Cancel</Button>
                                      <Button variant="destructive" onClick={handleDeleteSchedule}>Delete</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="modules" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Module Management</h3>
                    <Dialog open={isAddModuleDialogOpen} onOpenChange={setIsAddModuleDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Module
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Module</DialogTitle>
                          <DialogDescription>
                            Create a new module with all required information
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">Code *</Label>
                            <Input
                              id="code"
                              value={newModule.code}
                              onChange={(e) => setNewModule(prev => ({ ...prev, code: e.target.value }))}
                              className="col-span-3"
                              placeholder="e.g., CS101"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name *</Label>
                            <Input
                              id="name"
                              value={newModule.name}
                              onChange={(e) => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                              className="col-span-3"
                              placeholder="e.g., Introduction to Programming"
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input
                              id="description"
                              value={newModule.description}
                              onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                              className="col-span-3"
                              placeholder="Enter module description"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="speciality" className="text-right">Speciality *</Label>
                            <Select
                              value={newModule.specialityId?.toString()}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, specialityId: parseInt(value) }))}
                              required
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select speciality" />
                              </SelectTrigger>
                              <SelectContent>
                                {specialities.map((speciality) => (
                                  <SelectItem key={speciality.id} value={speciality.id.toString()}>
                                    {speciality.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="academicYear" className="text-right">Academic Year *</Label>
                            <Select
                              value={newModule.academicYear.toString()}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, academicYear: parseInt(value) }))}
                              required
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">First Year</SelectItem>
                                <SelectItem value="2">Second Year</SelectItem>
                                <SelectItem value="3">Third Year</SelectItem>
                                <SelectItem value="4">Fourth Year</SelectItem>
                                <SelectItem value="5">Fifth Year</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="semestre" className="text-right">Semester *</Label>
                            <Select
                              value={newModule.semester}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, semester: value }))}
                              required
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select semester" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SEMESTRE1">Semester 1</SelectItem>
                                <SelectItem value="SEMESTRE2">Semester 2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="palier" className="text-right">Palier *</Label>
                            <Select
                              value={newModule.palierId?.toString()}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, palierId: parseInt(value) }))}
                              required
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select palier" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">LMD</SelectItem>
                                <SelectItem value="2">ING</SelectItem>
                                <SelectItem value="3">SIGL</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="year" className="text-right">Year *</Label>
                            <Select
                              value={newModule.yearId?.toString()}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, yearId: parseInt(value) }))}
                              required
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select year" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">L1</SelectItem>
                                <SelectItem value="2">L2</SelectItem>
                                <SelectItem value="3">L3</SelectItem>
                                <SelectItem value="4">M1</SelectItem>
                                <SelectItem value="5">M2</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsAddModuleDialogOpen(false)}>Cancel</Button>
                          <Button onClick={handleAddModule}>Add Module</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Speciality</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Year</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Semester</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Palier</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modules.map((module) => (
                          <tr key={module.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">{module.code}</td>
                            <td className="px-4 py-3">{module.name}</td>
                            <td className="px-4 py-3">{module.speciality}</td>
                            <td className="px-4 py-3">{module.year}</td>
                            <td className="px-4 py-3">{module.semester}</td>
                            <td className="px-4 py-3">{module.palier}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Dialog open={isEditModuleDialogOpen} onOpenChange={setIsEditModuleDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-emerald-600"
                                      onClick={() => setSelectedModule(module)}
                                    >
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Edit Module</DialogTitle>
                                      <DialogDescription>
                                        Modify the module details.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedModule && (
                                      <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-code" className="text-right">Code</Label>
                                          <Input
                                            id="edit-code"
                                            value={selectedModule.code}
                                            onChange={(e) => setSelectedModule(prev => ({ ...prev, code: e.target.value }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-name" className="text-right">Name</Label>
                                          <Input
                                            id="edit-name"
                                            value={selectedModule.name}
                                            onChange={(e) => setSelectedModule(prev => ({ ...prev, name: e.target.value }))}
                                            className="col-span-3"
                                          />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-speciality" className="text-right">Speciality</Label>
                                          <Select
                                            value={selectedModule.speciality}
                                            onValueChange={(value) => setSelectedModule(prev => ({ ...prev, speciality: value }))}
                                          >
                                            <SelectTrigger className="col-span-3 w-full">
                                              <SelectValue placeholder="Select speciality" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {specialities.map((speciality) => (
                                                <SelectItem key={speciality.id} value={speciality.name}>
                                                  {speciality.name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-year" className="text-right">Year</Label>
                                          <Select
                                            value={selectedModule.year.toString()}
                                            onValueChange={(value) => setSelectedModule(prev => ({ ...prev, year: parseInt(value) }))}
                                          >
                                            <SelectTrigger className="col-span-3">
                                              <SelectValue placeholder="Select year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="1">First Year</SelectItem>
                                              <SelectItem value="2">Second Year</SelectItem>
                                              <SelectItem value="3">Third Year</SelectItem>
                                              <SelectItem value="4">Fourth Year</SelectItem>
                                              <SelectItem value="5">Fifth Year</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-semester" className="text-right">Semester</Label>
                                          <Select
                                            value={selectedModule.semester}
                                            onValueChange={(value) => setSelectedModule(prev => ({ ...prev, semester: value }))}
                                          >
                                            <SelectTrigger className="col-span-3">
                                              <SelectValue placeholder="Select semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="SEMESTRE1">Semester 1</SelectItem>
                                              <SelectItem value="SEMESTRE2">Semester 2</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                          <Label htmlFor="edit-palier" className="text-right">Palier</Label>
                                          <Select
                                            value={selectedModule.palier}
                                            onValueChange={(value) => setSelectedModule(prev => ({ ...prev, palier: value }))}
                                          >
                                            <SelectTrigger className="col-span-3">
                                              <SelectValue placeholder="Select palier" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="LMD">LMD</SelectItem>
                                              <SelectItem value="ING">ING</SelectItem>
                                              <SelectItem value="SIGL">SIGL</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsEditModuleDialogOpen(false)}>Cancel</Button>
                                      <Button onClick={handleEditModule}>Save Changes</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <Dialog open={isDeleteModuleDialogOpen} onOpenChange={setIsDeleteModuleDialogOpen}>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="h-8 text-red-600"
                                      onClick={() => setSelectedModule(module)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-white">
                                    <DialogHeader>
                                      <DialogTitle>Delete Module</DialogTitle>
                                      <DialogDescription>
                                        Are you sure you want to delete this module? This action cannot be undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    {selectedModule && (
                                      <div className="py-4">
                                        <p className="text-sm text-gray-500">
                                          You are about to delete module {selectedModule.code} ({selectedModule.name}).
                                        </p>
                                      </div>
                                    )}
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsDeleteModuleDialogOpen(false)}>Cancel</Button>
                                      <Button variant="destructive" onClick={handleDeleteModule}>Delete</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
        </TabsContent>

                <TabsContent value="sections" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Section Management</h3>
                        <Button 
                      onClick={() => setIsAddSectionDialogOpen(true)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Section
                        </Button>
                      </div>

                  {/* Section List */}
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Speciality</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Academic Year</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                        {sections.map((section) => (
                          <tr key={section.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">Section {section.name}</td>
                            <td className="px-4 py-3">
                              {specialities.find(s => s.id === section.specialityId)?.name || 'N/A'}
                            </td>
                            <td className="px-4 py-3">Year {section.academicYear}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditSectionClick(section)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteSectionClick(section)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>

                  {/* Add/Edit Section Dialog */}
                  <Dialog open={isAddSectionDialogOpen || isEditSectionDialogOpen} onOpenChange={isEditSectionDialogOpen ? setIsEditSectionDialogOpen : setIsAddSectionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                        <DialogTitle>{isEditSectionDialogOpen ? 'Edit Section' : 'Add Section'}</DialogTitle>
                <DialogDescription>
                          {isEditSectionDialogOpen ? 'Edit the section details.' : 'Add a new section.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                          <Label htmlFor="section-name">Section Name</Label>
                  <Input
                            id="section-name"
                            value={newSection.name}
                            onChange={(e) => setNewSection(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter section name (e.g., A, B, C)"
                  />
                </div>
                <div className="grid gap-2">
                          <Label htmlFor="section-speciality">Speciality</Label>
                  <Select
                            value={newSection.specialityId}
                            onValueChange={(value) => setNewSection(prev => ({ ...prev, specialityId: parseInt(value) }))}
                  >
                            <SelectTrigger id="section-speciality">
                      <SelectValue placeholder="Select speciality" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSpecialities.map(speciality => (
                                <SelectItem key={speciality.id} value={speciality.id.toString()}>
                          {speciality.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                          <Label htmlFor="section-year">Academic Year</Label>
                  <Select
                            value={newSection.academicYear.toString()}
                            onValueChange={(value) => setNewSection(prev => ({ ...prev, academicYear: parseInt(value) }))}
                  >
                            <SelectTrigger id="section-year">
                              <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                              <SelectItem value="1">First Year</SelectItem>
                              <SelectItem value="2">Second Year</SelectItem>
                              <SelectItem value="3">Third Year</SelectItem>
                              <SelectItem value="4">Fourth Year</SelectItem>
                              <SelectItem value="5">Fifth Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                          <Label htmlFor="section-module">Module</Label>
                  <Select
                            value={newSection.moduleId}
                            onValueChange={(value) => setNewSection(prev => ({ ...prev, moduleId: parseInt(value) }))}
                  >
                            <SelectTrigger id="section-module">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules
                        .filter(module => 
                          module.specialityId === newSection.specialityId && 
                          module.academicYear === newSection.academicYear
                        )
                        .map(module => (
                          <SelectItem key={module.id} value={module.id.toString()}>
                            {module.code} - {module.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                          isEditSectionDialogOpen ? setIsEditSectionDialogOpen(false) : setIsAddSectionDialogOpen(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={isEditSectionDialogOpen ? handleEditSection : handleAddSection}
                >
                          {isEditSectionDialogOpen ? 'Save Changes' : 'Add Section'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

                  {/* Delete Section Dialog */}
                  <Dialog open={isDeleteSectionDialogOpen} onOpenChange={setIsDeleteSectionDialogOpen}>
            <DialogContent>
              <DialogHeader>
                        <DialogTitle>Delete Section</DialogTitle>
                <DialogDescription>
                          Are you sure you want to delete this section? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteSectionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={handleDeleteSection}
                        >
                          Delete
                        </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Preview Extracted Schedule</CardTitle>
              <CardDescription>Review and validate the extracted schedule data before importing</CardDescription>
            </CardHeader>
            <CardContent>
              {extractedData ? (
                <div className="space-y-6">
                  {/* Header Information */}
                  {extractedData.data.headerInfo && (
                    <div className="rounded-lg border p-4 bg-gray-50">
                      <h3 className="font-medium mb-2">Header Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {Object.entries(extractedData.data.headerInfo).map(([key, value]) => (
                          value && (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500">{key}:</span>
                              <span className="text-sm">{value}</span>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Schedule Entries */}
                  {extractedData.data.scheduleEntries && extractedData.data.scheduleEntries.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 border-b">
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Day</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Professor</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Groups</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractedData.data.scheduleEntries.map((entry, index) => (
                            <tr key={index} className="border-b hover:bg-gray-50">
                              <td className="px-4 py-3">{entry.dayOfWeek}</td>
                              <td className="px-4 py-3">{`${entry.startTime} - ${entry.endTime}`}</td>
                              <td className="px-4 py-3">{entry.moduleName}</td>
                              <td className="px-4 py-3">{entry.professorName}</td>
                              <td className="px-4 py-3">{entry.roomNumber}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                  entry.roomType === 'COURSE' ? 'bg-blue-100 text-blue-800' :
                                  entry.roomType === 'TD' ? 'bg-green-100 text-green-800' :
                                  entry.roomType === 'TP' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {entry.roomType}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {entry.groups?.map((group, i) => (
                                  <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800 mr-1">
                                    {group}
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No schedule entries found in the extracted data.
                    </div>
                  )}

                  {/* Processing Logs */}
                  {processingLogs.length > 0 && (
                    <div className="rounded-lg border p-4 bg-gray-50">
                      <h3 className="font-medium mb-2">Processing Logs</h3>
                      <div className="space-y-2">
                        {processingLogs.map((log, index) => (
                          <div key={index} className={`text-sm ${
                            log.type === 'error' ? 'text-red-600' :
                            log.type === 'success' ? 'text-green-600' :
                            'text-gray-600'
                          }`}>
                            {log.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No data to preview. Please upload and process a schedule file first.
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => {
                setExtractedData(null);
                setProcessingLogs([]);
                setActiveTab('upload');
              }}>
                Back to Upload
              </Button>
              {extractedData && (
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleFinalizeImport}
                  disabled={!formData.speciality || !formData.year || !formData.semester || !formData.section}
                >
                  Import Schedule
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="specialities" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Specialities Management</CardTitle>
              <CardDescription>View and manage all specialities in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Palier</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {specialities.map((speciality) => (
                      <tr key={speciality.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">{speciality.name}</td>
                        <td className="px-4 py-3">{speciality.description || 'N/A'}</td>
                        <td className="px-4 py-3">{speciality.palier?.name || 'N/A'}</td>
                        <td className="px-4 py-3">{speciality.year?.name || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
  