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

export default function Planning() {
  // State for form fields
  const [formData, setFormData] = useState({
    semester: '',
    year: '',
    speciality: '',
    section: '',
    fileType: 'docx'
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
  const [isLoading, setIsLoading] = useState(false);
  const [specialityFile, setSpecialityFile] = useState(null);
  const [isUploadingSpecialities, setIsUploadingSpecialities] = useState(false);

  // State for new/edit classroom form
  const [newClassroom, setNewClassroom] = useState({
    number: "",
    type: "SALLE_COURS",
    capacity: "",
    status: "Available"
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
    code: "",
    name: "",
    speciality: "Informatique",
    year: 1,
    semester: "SEMESTRE1",
    palier: "LMD"
  });
  const [isAddModuleDialogOpen, setIsAddModuleDialogOpen] = useState(false);
  const [isEditModuleDialogOpen, setIsEditModuleDialogOpen] = useState(false);
  const [isDeleteModuleDialogOpen, setIsDeleteModuleDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);

  // State for file upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // State for validation
  const [formErrors, setFormErrors] = useState({});

  // Add new state for section schedules
  const [sectionSchedules, setSectionSchedules] = useState([]);
  const [selectedSection, setSelectedSection] = useState(''); // Use empty string initially
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
  
      // Step 1: Filter specialties
      const filtered = specialities.filter(speciality => {
        const name = speciality.name.toUpperCase().replace(/ /g, ''); // Normalize name
        let targetCodes = [];
  
        // Years 1-3: Match L1/L2/L3, Licence1/Licence2/Licence3, or ING1/ING2/ING3
        if (yearNumber >= 1 && yearNumber <= 3) {
          targetCodes.push(
            `L${yearNumber}`, 
            `LICENCE${yearNumber}`, // Matches "Licence1", "Licence2", etc.
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
  
      // Step 2: Deduplicate specialties by name (e.g., SIGL L2)
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
          setSectionSchedules(response.data.schedules);
          console.log('Received schedule data:', response.data.schedules);
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
  const handleAddClassroom = () => {
    const classroom = {
      id: classrooms.length + 1,
      ...newClassroom,
      capacity: parseInt(newClassroom.capacity)
    };
    setClassrooms(prev => [...prev, classroom]);
    setNewClassroom({
      number: "",
      type: "SALLE_COURS",
      capacity: "",
      status: "Available"
    });
    setIsAddDialogOpen(false);
  };

  // Handle editing classroom
  const handleEditClassroom = () => {
    setClassrooms(prev => prev.map(room => 
      room.id === selectedClassroom.id ? { ...selectedClassroom } : room
    ));
    setIsEditDialogOpen(false);
  };

  // Handle deleting classroom
  const handleDeleteClassroom = () => {
    setClassrooms(prev => prev.filter(room => room.id !== selectedClassroom.id));
    setIsDeleteDialogOpen(false);
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
  const handleAddModule = () => {
    const module = {
      id: modules.length + 1,
      ...newModule,
      year: parseInt(newModule.year)
    };
    setModules(prev => [...prev, module]);
    setNewModule({
      code: "",
      name: "",
      speciality: "Informatique",
      year: 1,
      semester: "SEMESTRE1",
      palier: "LMD"
    });
    setIsAddModuleDialogOpen(false);
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

  // Update file upload handler to handle both DOCX and PDF files
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
      if (!['docx', 'pdf'].includes(fileExtension)) {
        setError('Please upload a .docx or .pdf file');
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
        'pdf': ['application/pdf']
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

  // Update handleProcessFile to include file type
  const handleProcessFile = async () => {
    if (!validateForm()) {
      setError('Please fill in all required fields');
      return;
    }

    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFile);
    formDataToSend.append('semester', formData.semester);
    formDataToSend.append('year', formData.year);
    formDataToSend.append('speciality', formData.speciality);
    formDataToSend.append('section', formData.section);
    formDataToSend.append('fileType', formData.fileType);

    try {
      setIsProcessing(true);
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access this feature');
        return;
      }

      const response = await api.post('/admin/extract-schedule', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('File processing response:', response.data);
      
      if (response.data.success) {
        // Check if the response has the expected structure
        if (!response.data.data || !response.data.data.scheduleEntries) {
          console.error('Invalid response structure:', response.data);
          toast.error('Invalid data format received from server');
          return;
        }

        setExtractedData(response.data);
        toast.success('Schedule processed successfully');
        const tabsList = document.querySelector('[role="tablist"]');
        const previewTab = tabsList?.querySelector('[value="preview"]');
        if (previewTab) {
          previewTab.click();
        }
      } else {
        const errorMsg = response.data.message || 'Error processing file';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      const errorMessage = err.response?.data?.message || 'Error processing file';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add click handler for the Browse Files button
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Update handleFinalizeImport to handle the data structure correctly
  const handleFinalizeImport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to access this feature');
        return;
      }

      console.log('Starting import process...');
      console.log('Extracted data:', extractedData);
      console.log('Form data:', formData);

      if (!extractedData?.data?.scheduleEntries || !Array.isArray(extractedData.data.scheduleEntries)) {
        console.error('Invalid extracted data structure:', extractedData);
        toast.error('No valid schedule data to import');
        return;
      }

      const scheduleEntries = extractedData.data.scheduleEntries;
      if (scheduleEntries.length === 0) {
        console.error('No schedule entries found');
        toast.error('No schedule entries to import');
        return;
      }

      // Log the first entry to verify structure
      console.log('First schedule entry:', scheduleEntries[0]);

      // Prepare the data for saving
      const scheduleData = {
        specialityName: formData.speciality,
        academicYear: parseInt(formData.year),
        semester: formData.semester,
        sectionName: formData.section,
        scheduleEntries: scheduleEntries.map(entry => {
          console.log('Processing entry:', entry);
          
          if (!entry || !entry.modules || !entry.professors || !entry.rooms) {
            console.error('Invalid entry format:', entry);
            throw new Error('Invalid schedule entry format');
          }

          const processedEntry = {
            day: entry.day,
            timeSlot: entry.timeSlot,
            module: entry.modules[0],
            professor: entry.professors[0],
            room: entry.rooms[0]?.number || '',
            type: entry.type || 'COURSE',
            groups: Array.isArray(entry.groups) ? entry.groups : [entry.groups]
          };

          console.log('Processed entry:', processedEntry);
          return processedEntry;
        })
      };

      console.log('Sending schedule data to server:', scheduleData);

      const response = await api.post('/admin/schedules/section/bulk', scheduleData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('Server response:', response.data);

      if (response.data.success) {
        toast.success('Schedule imported successfully');
        
        // Immediately fetch the updated schedules
        try {
          console.log('Fetching updated schedules...');
          const updatedResponse = await api.get('/admin/schedules/section', {
            params: {
              section: formData.section,
              speciality: formData.speciality,
              year: formData.year,
              semester: formData.semester
            },
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('Updated schedules response:', updatedResponse.data);
          
          if (updatedResponse.data.success) {
            setSectionSchedules(updatedResponse.data.schedules);
            console.log('Schedules updated in state:', updatedResponse.data.schedules);
          } else {
            console.error('Failed to fetch updated schedules:', updatedResponse.data.message);
            toast.error('Schedule saved but failed to refresh view');
          }
        } catch (fetchError) {
          console.error('Error fetching updated schedules:', fetchError);
          toast.error('Schedule saved but failed to refresh view');
        }
      } else {
        console.error('Server returned error:', response.data);
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
      const response = await api.post('/api/admin/import-specialities', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success('Specialities imported successfully');
        // Refresh specialities list
        const specialitiesResponse = await api.get('/api/admin/specialities', {
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

        if (response.data.success) {
          console.log('Fetched schedules:', response.data.schedules);
          setSectionSchedules(response.data.schedules);
        } else {
          console.error('Failed to fetch schedules:', response.data.message);
          toast.error(response.data.message || 'Failed to fetch schedules');
        }
      } catch (error) {
        console.error('Error fetching schedules:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch schedules');
      }
    };

    fetchSchedules();
  }, [formData.section, formData.speciality, formData.year, formData.semester]);

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
                      <SelectItem value="A">Section A</SelectItem>
                        <SelectItem value="B">Section B</SelectItem>
                        <SelectItem value="C">Section C</SelectItem>
                        <SelectItem value="D">Section D</SelectItem>
                        <SelectItem value="1">Section D</SelectItem>
                        <SelectItem value="2">Section D</SelectItem>
                        <SelectItem value="3">Section D</SelectItem>  
                        <SelectItem value="4">Section D</SelectItem>
                        <SelectItem value="5">Section D</SelectItem>
                        <SelectItem value="6">Section D</SelectItem>
                        <SelectItem value="7">Section D</SelectItem>
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
                    accept=".docx,.pdf"
                    className="hidden"
                    disabled={!formData.semester || !formData.year || !formData.speciality || !formData.section}
                  />
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleBrowseClick}
                    disabled={!formData.semester || !formData.year || !formData.speciality || !formData.section}
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
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="classrooms">Classrooms</TabsTrigger>
                  <TabsTrigger value="schedules">Schedules</TabsTrigger>
                  <TabsTrigger value="modules">Modules</TabsTrigger>
                  <TabsTrigger value="section-schedules">Section Schedules</TabsTrigger>
                </TabsList>

                <TabsContent value="classrooms" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Classroom Management</h3>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                          <Plus className="h-4 w-4 mr-2" />
                          Add New Classroom
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Add New Classroom</DialogTitle>
                          <DialogDescription>
                            Fill in the details for the new classroom.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="number" className="text-right">Room Number</Label>
                            <Input
                              id="number"
                              name="number"
                              value={newClassroom.number}
                              onChange={handleInputChange}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="type" className="text-right">Type</Label>
                            <Select
                              value={newClassroom.type}
                              onValueChange={(value) => setNewClassroom(prev => ({ ...prev, type: value }))}
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
                            <Label htmlFor="capacity" className="text-right">Capacity</Label>
                            <Input
                              id="capacity"
                              name="capacity"
                              type="number"
                              value={newClassroom.capacity}
                              onChange={handleInputChange}
                              className="col-span-3"
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
                                          You are about to delete schedule for {selectedSchedule.module} ({selectedSchedule.day} {selectedSchedule.time}).
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
                      <DialogContent className="bg-white">
                        <DialogHeader>
                          <DialogTitle>Add New Module</DialogTitle>
                          <DialogDescription>
                            Fill in the module details.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">Code</Label>
                            <Input
                              id="code"
                              value={newModule.code}
                              onChange={(e) => setNewModule(prev => ({ ...prev, code: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input
                              id="name"
                              value={newModule.name}
                              onChange={(e) => setNewModule(prev => ({ ...prev, name: e.target.value }))}
                              className="col-span-3"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="speciality" className="text-right">Speciality</Label>
                            <Select
                              value={newModule.speciality}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, speciality: value }))}
                            >
                              <SelectTrigger className="col-span-3">
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
                            <Label htmlFor="year" className="text-right">Year</Label>
                            <Select
                              value={newModule.year.toString()}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, year: parseInt(value) }))}
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
                            <Label htmlFor="semester" className="text-right">Semester</Label>
                            <Select
                              value={newModule.semester}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, semester: value }))}
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
                            <Label htmlFor="palier" className="text-right">Palier</Label>
                            <Select
                              value={newModule.palier}
                              onValueChange={(value) => setNewModule(prev => ({ ...prev, palier: value }))}
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
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Preview Extracted Schedule</CardTitle>
              <CardDescription>Review and validate the extracted schedule data before finalizing</CardDescription>
            </CardHeader>
            <CardContent>
              {extractedData ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between bg-emerald-50 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-emerald-600" />
                      <div>
                        <div className="font-medium">{selectedFile?.name}</div>
                        <div className="text-xs text-gray-500">Processed successfully</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleBrowseClick}>
                        Upload New File
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
                      <div className="font-medium">Extracted Schedule Data</div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            toast.error('Report submitted');
                          }}
                        >
                          <AlertCircle className="h-4 w-4 mr-1" /> Report Issues
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-emerald-600 hover:bg-emerald-700"
                          onClick={handleFinalizeImport}
                          disabled={isProcessing}
                        >
                          {isProcessing ? 'Importing...' : 'Finalize & Import'}
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Professor</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Day</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Group</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                          </tr>
                        </thead>
                        <tbody>
                          {extractedData?.data?.scheduleEntries?.map((entry, index) => (
                            <tr key={index} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                              <td className="px-4 py-3">{entry.modules[0]}</td>
                              <td className="px-4 py-3">{entry.professors[0]}</td>
                              <td className="px-4 py-3">{entry.day}</td>
                              <td className="px-4 py-3">{entry.timeSlot}</td>
                              <td className="px-4 py-3">{entry.type}</td>
                              <td className="px-4 py-3">{entry.groups[0]}</td>
                              <td className="px-4 py-3">
                                {entry.rooms[0] ? `${entry.rooms[0].type} ${entry.rooms[0].number}` : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Upload a schedule file to preview extracted data</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Upload History</CardTitle>
              <CardDescription>Previous schedule uploads and their processing status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">File Name</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Uploaded By</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Semester</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        fileName: "Fall2023_Schedule.docx",
                        uploadedBy: "Admin User",
                        date: "Oct 15, 2023",
                        semester: "Fall 2023",
                        status: "Processed",
                      },
                      {
                        fileName: "CS_Department_Spring2024.xlsx",
                        uploadedBy: "Admin User",
                        date: "Oct 10, 2023",
                        semester: "Spring 2024",
                        status: "Processed",
                      },
                      {
                        fileName: "Math_Department_Fall2023.docx",
                        uploadedBy: "Department Head",
                        date: "Sep 28, 2023",
                        semester: "Fall 2023",
                        status: "Processed",
                      },
                      {
                        fileName: "Engineering_Spring2024.docx",
                        uploadedBy: "Admin User",
                        date: "Sep 20, 2023",
                        semester: "Spring 2024",
                        status: "Failed",
                      },
                      {
                        fileName: "Summer2023_AllDepartments.xlsx",
                        uploadedBy: "System Admin",
                        date: "May 15, 2023",
                        semester: "Summer 2023",
                        status: "Processed",
                      },
                    ].map((item, index) => (
                      <tr key={index} className={`border-b ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-4 py-3 flex items-center gap-2">
                          {item.fileName.endsWith(".docx") ? (
                            <FileText className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileSpreadsheet className="h-4 w-4 text-green-500" />
                          )}
                          {item.fileName}
                        </td>
                        <td className="px-4 py-3">{item.uploadedBy}</td>
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3">{item.semester}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              item.status === "Processed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            >
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              Download
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="specialities" className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-lg">Manage Specialities</CardTitle>
              <CardDescription>Upload Excel file containing paliers and specialities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-center">
                  <div className="mb-4 rounded-full bg-emerald-50 p-3">
                    <Database className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Upload Specialities Excel File</h3>
                  <p className="text-sm text-gray-500 mb-4">Upload an Excel file containing paliers and specialities</p>
                  <div className="flex gap-2 mb-4">
                    <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700 flex items-center">
                      <FileSpreadsheet className="h-3 w-3 mr-1" /> XLSX
                    </div>
                  </div>
                  <input
                    type="file"
                    accept=".xlsx"
                    onChange={(e) => setSpecialityFile(e.target.files[0])}
                    className="hidden"
                    id="speciality-file"
                  />
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => document.getElementById('speciality-file').click()}
                    disabled={isUploadingSpecialities}
                  >
                    {isUploadingSpecialities ? 'Uploading...' : 'Browse Files'}
                  </Button>
                  {specialityFile && (
                    <div className="mt-4 p-3 bg-emerald-50 rounded-lg flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm text-emerald-700">{specialityFile.name}</span>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border p-4 bg-blue-50 text-blue-800 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium">File Requirements</h4>
                    <p className="text-sm mt-1">
                      The Excel file should contain the following columns:
                    </p>
                    <ul className="list-disc list-inside mt-2 text-sm">
                      <li>Palier (LMD, ING, SIGL)</li>
                      <li>Specialités (Speciality names)</li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSpecialityFileUpload}
                    disabled={!specialityFile || isUploadingSpecialities}
                  >
                    {isUploadingSpecialities ? 'Uploading...' : 'Upload & Process'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="section-schedules" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Section Schedule Management</h3>
            <Button 
              onClick={() => setIsAddSectionScheduleDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={!selectedSection || !formData.speciality || !formData.year || !formData.semester}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>

          {/* Section Selection */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="year-select">Year</Label>
              <Select 
                value={formData.year} 
                onValueChange={(value) => handleFormChange('year', value)}
              >
                <SelectTrigger id="year-select">
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

            <div className="space-y-2">
              <Label htmlFor="speciality-select">Speciality</Label>
              <Select 
                value={formData.speciality} 
                onValueChange={(value) => handleFormChange('speciality', value)}
                disabled={!formData.year}
              >
                <SelectTrigger id="speciality-select">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="section-select">Section</Label>
              <Select 
                value={selectedSection} 
                onValueChange={setSelectedSection}
                disabled={!formData.speciality || !formData.year}
              >
                <SelectTrigger id="section-select">
                  <SelectValue placeholder="Select a section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A</SelectItem>
                  <SelectItem value="B">Section B</SelectItem>
                  <SelectItem value="C">Section C</SelectItem>
                  <SelectItem value="D">Section D</SelectItem>
                  <SelectItem value="1">Section 1</SelectItem>
                  <SelectItem value="2">Section 2</SelectItem>
                  <SelectItem value="3">Section 3</SelectItem>
                  <SelectItem value="4">Section 4</SelectItem>
                  <SelectItem value="5">Section 5</SelectItem>
                  <SelectItem value="6">Section 6</SelectItem>
                  <SelectItem value="7">Section 7</SelectItem>
                </SelectContent>
              </Select>
              {!formData.speciality || !formData.year ? (
                 <p className="text-sm text-gray-500">Select Speciality and Year to load sections.</p>
              ) : null}
            </div>
          </div>

          {/* Schedule Table */}
          <div className="rounded-md border">
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50">
                    <th className="h-12 px-4 text-left align-middle font-medium">Day</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Time Slot</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Module</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Professor</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Room</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Type</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Groups</th>
                    <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {Array.isArray(sectionSchedules) && sectionSchedules
                    .filter(schedule => schedule && schedule.section === selectedSection)
                    .map((schedule, index) => (
                      <tr key={index} className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50">
                        <td className="p-4 align-middle">{schedule.day}</td>
                        <td className="p-4 align-middle">{schedule.timeSlot}</td>
                        <td className="p-4 align-middle">{schedule.module}</td>
                        <td className="p-4 align-middle">{schedule.professor}</td>
                        <td className="p-4 align-middle">{schedule.room}</td>
                        <td className="p-4 align-middle">{schedule.type}</td>
                        <td className="p-4 align-middle">{Array.isArray(schedule.groups) ? schedule.groups.join(', ') : ''}</td>
                        <td className="p-4 align-middle">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditSectionScheduleClick(schedule)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteSectionScheduleClick(schedule)}
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
          </div>

          {/* Add/Edit Section Schedule Dialog */}
          <Dialog open={isAddSectionScheduleDialogOpen || isEditSectionScheduleDialogOpen} onOpenChange={isEditSectionScheduleDialogOpen ? setIsEditSectionScheduleDialogOpen : setIsAddSectionScheduleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{isEditSectionScheduleDialogOpen ? 'Edit Section Schedule' : 'Add Section Schedule'}</DialogTitle>
                <DialogDescription>
                  {isEditSectionScheduleDialogOpen ? 'Edit the schedule entry.' : 'Add a new schedule entry for the selected section.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="day">Day</Label>
                  <Select
                    value={newSectionSchedule.day}
                    onValueChange={(value) => setNewSectionSchedule(prev => ({ ...prev, day: value }))}
                  >
                    <SelectTrigger id="day">
                      <SelectValue placeholder="Select day" />
                    </SelectTrigger>
                    <SelectContent>
                      {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'].map(day => (
                        <SelectItem key={day} value={day}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="timeSlot">Time Slot</Label>
                  <Input
                    id="timeSlot"
                    value={newSectionSchedule.timeSlot}
                    onChange={(e) => setNewSectionSchedule(prev => ({ ...prev, timeSlot: e.target.value }))}
                    placeholder="e.g., 10:00 - 12:00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="module">Module</Label>
                  <Select
                    value={newSectionSchedule.module}
                    onValueChange={(value) => setNewSectionSchedule(prev => ({ ...prev, module: value }))}
                  >
                    <SelectTrigger id="module">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {modules.map(module => (
                        <SelectItem key={module.id} value={module.name}>
                          {module.code} - {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="professor">Professor</Label>
                  <Input
                    id="professor"
                    value={newSectionSchedule.professor}
                    onChange={(e) => setNewSectionSchedule(prev => ({ ...prev, professor: e.target.value }))}
                    placeholder="Enter professor name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="room">Room</Label>
                  <Select
                    value={newSectionSchedule.room}
                    onValueChange={(value) => setNewSectionSchedule(prev => ({ ...prev, room: value }))}
                  >
                    <SelectTrigger id="room">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map(room => (
                        <SelectItem key={room.id} value={room.number}>
                          {room.number} - {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newSectionSchedule.type}
                    onValueChange={(value) => setNewSectionSchedule(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger id="type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {['COURSE', 'TD', 'TP'].map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="groups">Groups</Label>
                  <Input
                    id="groups"
                    value={newSectionSchedule.groups.join(', ')}
                    onChange={(e) => setNewSectionSchedule(prev => ({ 
                      ...prev, 
                      groups: e.target.value.split(',').map(g => g.trim()) 
                    }))}
                    placeholder="Enter groups (comma-separated)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  isEditSectionScheduleDialogOpen ? setIsEditSectionScheduleDialogOpen(false) : setIsAddSectionScheduleDialogOpen(false);
                }}>
                  Cancel
                </Button>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={isEditSectionScheduleDialogOpen ? handleEditSectionSchedule : handleAddSectionSchedule}
                >
                  {isEditSectionScheduleDialogOpen ? 'Save Changes' : 'Add Schedule'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {/* Delete Section Schedule Dialog */}
          <Dialog open={isDeleteSectionScheduleDialogOpen} onOpenChange={setIsDeleteSectionScheduleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Section Schedule</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this schedule entry? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              {selectedSchedule && (
                <div className="py-4">
                  <p className="text-sm text-gray-500">
                    You are about to delete the schedule for Module: {selectedSchedule.module}, Day: {selectedSchedule.day}, Time: {selectedSchedule.timeSlot}.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDeleteSectionScheduleDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDeleteSectionSchedule}>Delete</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  )
}
  