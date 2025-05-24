import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/ui/card';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Calendar } from '@/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Search, Upload, FileText, Users, Plus, Download, Trash2, Edit, CheckCircle, XCircle, UserSearch, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/utils/axios';
import { Label } from "@/ui/label"
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"

export default function SurveillanceManagement() {
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [showTeacherSearch, setShowTeacherSearch] = useState(false);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewAssignments, setPreviewAssignments] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [importing, setImporting] = useState(false);
  const [responsibleAssignments, setResponsibleAssignments] = useState(new Set());
  const [newAssignment, setNewAssignment] = useState({
    date: '',
    time: '',
    module: '',
    room: '',
    isResponsible: false
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (selectedTeacher) {
      fetchTeacherAssignments(selectedTeacher.id);
    } else {
      setAssignments([]);
    }
  }, [selectedTeacher]);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/api/admin/teachers');
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    }
  };

  const fetchTeacherAssignments = async (teacherId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/surveillance/teacher/${teacherId}`);
      if (response.data.success) {
        setAssignments(response.data.assignments || []);
      } else {
        toast.error('Failed to fetch teacher assignments');
        setAssignments([]);
      }
    } catch (error) {
      console.error('Error fetching teacher assignments:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch teacher assignments');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleResponsible = (index) => {
    setResponsibleAssignments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleFileUpload = async (event) => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['.doc', '.docx'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(ext)) {
      toast.error('Please upload a Microsoft Word document (.doc or .docx)');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('teacherId', selectedTeacher.id);

    try {
      const response = await api.post('/api/surveillance/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        // Initialize all assignments as non-responsible by default
        const assignments = response.data.assignments.map(assignment => ({
          ...assignment,
          isResponsible: false,
          canSwap: true
        }));
        setPreviewAssignments(assignments);
        setResponsibleAssignments(new Set()); // Reset responsible assignments
        setShowPreview(true);
        toast.success('File processed successfully');
      } else {
        toast.error(response.data.message || 'Failed to process file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!previewAssignments.length || !selectedTeacher) return;

    try {
      setImporting(true);
      const assignmentsWithResponsible = previewAssignments.map((assignment, index) => ({
        ...assignment,
        isResponsible: responsibleAssignments.has(index),
        canSwap: !responsibleAssignments.has(index) // Set canSwap based on isResponsible
      }));

      await api.post('/api/surveillance/confirm-upload', {
        assignments: assignmentsWithResponsible,
        fileId: previewAssignments[0]?.fileId,
        teacherId: selectedTeacher.id
      });
      toast.success('Surveillance assignments created successfully');
      setShowPreview(false);
      setPreviewAssignments([]);
      setResponsibleAssignments(new Set());
      fetchTeacherAssignments(selectedTeacher.id);
    } catch (error) {
      console.error('Error confirming upload:', error);
      toast.error(error.response?.data?.message || 'Failed to create surveillance assignments');
    } finally {
      setImporting(false);
    }
  };

  const handleAddAssignment = async () => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    try {
      const response = await api.post('/api/admin/surveillance', {
        ...newAssignment,
        teacherId: selectedTeacher.id,
        isResponsible: newAssignment.isResponsible,
        canSwap: !newAssignment.isResponsible
      });

      if (response.data.success) {
        toast.success('Assignment created successfully');
        setShowAddDialog(false);
        setNewAssignment({
          date: '',
          time: '',
          module: '',
          room: '',
          isResponsible: false
        });
        fetchTeacherAssignments(selectedTeacher.id);
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to create assignment');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/admin/surveillance/${assignmentId}`);
      if (response.data.success) {
        toast.success('Assignment deleted successfully');
        fetchTeacherAssignments(selectedTeacher.id);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
    }
  };

  const handleDeleteAllAssignments = async () => {
    if (!selectedTeacher) {
      toast.error('Please select a teacher first');
      return;
    }

    try {
      setDeleting(true);
      const response = await api.delete(`/api/admin/surveillance/teacher/${selectedTeacher.id}/all`);
      if (response.data.success) {
        toast.success('All assignments deleted successfully');
        setShowDeleteConfirm(false);
        fetchTeacherAssignments(selectedTeacher.id);
      }
    } catch (error) {
      console.error('Error deleting assignments:', error);
      toast.error(error.response?.data?.message || 'Failed to delete assignments');
    } finally {
      setDeleting(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher => 
    teacher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto py-6 space-y-6 bg-white">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Surveillance Management</h1>
      </div>

      <Card className="bg-white shadow-md">
        <CardHeader>
          <CardTitle>Upload Surveillance Schedule</CardTitle>
          <CardDescription>Select a teacher and upload their surveillance schedule</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Teacher</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                  onClick={() => setShowTeacherSearch(true)}
                >
                  {selectedTeacher ? selectedTeacher.name : "Select a teacher..."}
                  <UserSearch className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
                <Dialog open={showTeacherSearch} onOpenChange={setShowTeacherSearch}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Search Teacher</DialogTitle>
                      <DialogDescription>
                        Search for a teacher by name or email
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Search teachers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full"
                      />
                      <div className="max-h-[300px] overflow-y-auto">
                        {filteredTeachers.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">No teachers found</div>
                        ) : (
                          <div className="space-y-2">
                            {filteredTeachers.map((teacher) => (
                              <div
                                key={teacher.id}
                                className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 cursor-pointer"
                                onClick={() => {
                                  setSelectedTeacher(teacher);
                                  setShowTeacherSearch(false);
                                }}
                              >
                                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-medium">
                                  {teacher.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                  <div className="font-medium">{teacher.name}</div>
                                  <div className="text-sm text-gray-500">{teacher.email}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Upload Schedule File</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="file"
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileUpload}
                  disabled={!selectedTeacher || uploading}
                  className="flex-1"
                />
                {uploading && (
                  <div className="text-sm text-gray-500">Uploading...</div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {!selectedTeacher ? 'Please select a teacher first' : 'Upload a Word document (.doc or .docx)'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedTeacher && (
        <Card className="bg-white shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Current Assignments</CardTitle>
              <CardDescription>
                Surveillance assignments for {selectedTeacher.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={assignments.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All
              </Button>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Assignment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4 text-gray-500">Loading assignments...</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-4 text-gray-500">No assignments found</div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {format(new Date(assignment.date), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-4 py-3">{assignment.time}</td>
                        <td className="px-4 py-3">{assignment.module}</td>
                        <td className="px-4 py-3">{assignment.room}</td>
                        <td className="px-4 py-3">
                          {assignment.isResponsible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                              <Lock className="w-4 h-4" /> Responsible
                            </span>
                          ) : (
                            <span className="text-gray-500">Assistant</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteAssignment(assignment.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl bg-white max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Extracted Data</DialogTitle>
            <DialogDescription>
              Review the extracted surveillance assignments for {selectedTeacher?.name}. 
              Select which assignments the teacher will be responsible for.
            </DialogDescription>
          </DialogHeader>
          
          {/* New section for Responsible selection */}
          {previewAssignments.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-gray-900">Mark Responsible Assignments:</h4>
              <div className="border rounded-lg p-4 space-y-3 max-h-[300px] overflow-y-auto">
                {previewAssignments.map((assignment, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{assignment.module} - {assignment.room}</div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(assignment.date), 'dd/MM/yyyy')} at {assignment.time}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`responsible-select-${index}`}
                        checked={responsibleAssignments.has(index)}
                        onChange={() => handleToggleResponsible(index)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <label htmlFor={`responsible-select-${index}`} className="text-sm text-gray-700">
                        {responsibleAssignments.has(index) ? 'Responsible' : 'Assistant'}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">About Roles:</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-700" />
                <span><strong>Responsible:</strong> The teacher will be in charge of the surveillance and cannot swap this assignment.</span>
              </li>
              <li className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-500" />
                <span><strong>Assistant:</strong> The teacher will assist in the surveillance and can swap this assignment with other teachers.</span>
              </li>
            </ul>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowPreview(false)} disabled={importing}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmUpload}
              disabled={importing}
            >
              {importing ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Importing...
                </>
              ) : (
                'Confirm & Import'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Assignment</DialogTitle>
            <DialogDescription>
              Create a new surveillance assignment for {selectedTeacher?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={newAssignment.date}
                onChange={(e) => setNewAssignment({ ...newAssignment, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={newAssignment.time}
                onChange={(e) => setNewAssignment({ ...newAssignment, time: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Module</Label>
              <Input
                value={newAssignment.module}
                onChange={(e) => setNewAssignment({ ...newAssignment, module: e.target.value })}
                placeholder="Enter module name or code"
              />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input
                value={newAssignment.room}
                onChange={(e) => setNewAssignment({ ...newAssignment, room: e.target.value })}
                placeholder="Enter room number"
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isResponsible"
                  checked={newAssignment.isResponsible}
                  onChange={(e) => setNewAssignment({ ...newAssignment, isResponsible: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="isResponsible" className="text-sm font-medium text-gray-700">
                  Is Responsible
                </Label>
              </div>
              <div className="text-sm text-gray-500">
                {newAssignment.isResponsible ? (
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Lock className="h-4 w-4" />
                    This teacher will be responsible for this surveillance and cannot swap it
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="h-4 w-4" />
                    This teacher will be an assistant and can swap this assignment
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAssignment}>
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete All Assignments
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete all surveillance assignments for {selectedTeacher?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Warning:</h4>
              <ul className="text-sm text-red-700 space-y-2">
                <li>• This will delete all {assignments.length} surveillance assignments</li>
                <li>• Any pending swap requests will be cancelled</li>
                <li>• This action cannot be undone</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteAllAssignments}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All Assignments
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 