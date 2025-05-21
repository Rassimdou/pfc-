import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs"
import { Upload, FileText, FileSpreadsheet, Calendar, Check, AlertCircle, Plus, Trash2, Edit2, Database } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/ui/dialog"
import { useState, useRef, useEffect } from "react"
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function Planning() {
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

  // New states for schedules
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

  // New states for modules
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

  // Add new state for file upload
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Add new state for specialities
  const [specialities, setSpecialities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [specialityFile, setSpecialityFile] = useState(null);
  const [isUploadingSpecialities, setIsUploadingSpecialities] = useState(false);

  // Add useEffect to fetch specialities
  useEffect(() => {
    const fetchSpecialities = async () => {
      try {
        const response = await axios.get('/api/admin/specialities', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
        });
        if (response.data.success) {
          setSpecialities(response.data.specialities);
        }
      } catch (error) {
        console.error('Error fetching specialities:', error);
        toast.error('Failed to load specialities');
      }
    };

    fetchSpecialities();
  }, []);

  // Add new state for form fields
  const [formData, setFormData] = useState({
    semester: '',
    year: '',
    speciality: '',
    section: '',
    fileType: 'docx'
  });

  // Add validation state
  const [formErrors, setFormErrors] = useState({});

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

  // Update file upload handler to only store the file
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setError(null);
      
      // Validate file type
      if (file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        setError('Please upload a .docx file');
        setSelectedFile(null);
        return;
      }
    }
  };

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

  // Update handleProcessFile to include auth headers
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

    try {
      setIsProcessing(true);
      const response = await axios.post('/api/admin/extract-schedule', formDataToSend, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        setExtractedData(response.data.data.scheduleEntries);
        toast.success('Schedule processed successfully');
        const tabsList = document.querySelector('[role="tablist"]');
        const previewTab = tabsList?.querySelector('[value="preview"]');
        if (previewTab) {
          previewTab.click();
        }
      } else {
        setError(response.data.error || 'Error processing file');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error processing file');
      console.error('Error uploading file:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Add click handler for the Browse Files button
  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  // Update handleFinalizeImport to include auth headers
  const handleFinalizeImport = async () => {
    if (!extractedData) return;

    try {
      setIsProcessing(true);
      const response = await axios.post('/api/planning/import-schedule', {
        scheduleData: extractedData
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        toast.success('Schedule imported successfully');
      } else {
        setError(response.data.error || 'Error importing schedule');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error importing schedule');
      console.error('Error importing schedule:', err);
    } finally {
      setIsProcessing(false);
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
      const response = await axios.post('/api/admin/import-specialities', formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'multipart/form-data',
        },
        withCredentials: true
      });

      if (response.data.success) {
        toast.success('Specialities imported successfully');
        // Refresh specialities list
        const specialitiesResponse = await axios.get('/api/admin/specialities', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          withCredentials: true
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
                        {specialities.map((speciality) => (
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
                      </SelectContent>
                    </Select>
                    {formErrors.section && (
                      <p className="text-sm text-red-500 mt-1">{formErrors.section}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="file-type">File Type</Label>
                    <Select defaultValue="docx">
                      <SelectTrigger id="file-type" className="w-full">
                        <SelectValue placeholder="Select file type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="docx">Word Document</SelectItem>
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
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".docx"
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
                              <SelectTrigger className="col-span-3 w-full">
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
                          {extractedData.map((entry, index) => (
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
      </Tabs>
    </div>
  )
}
