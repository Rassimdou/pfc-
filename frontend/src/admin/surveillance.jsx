import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/ui/card';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';
import { Calendar } from '@/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, Search, Upload, FileText, Users, Plus, Download, Trash2, Edit, CheckCircle, XCircle, UserSearch } from 'lucide-react';
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
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/admin/teachers');
      setTeachers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to fetch teachers');
    }
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
      const response = await api.post('/surveillance/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setPreviewAssignments(response.data.assignments);
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
    if (!previewAssignments.length) return;

    try {
      await api.post('/surveillance/confirm-upload', {
        assignments: previewAssignments,
        fileId: previewAssignments[0]?.fileId
      });
      toast.success('Surveillance assignments created successfully');
      setShowPreview(false);
      setPreviewAssignments([]);
      setSelectedTeacher(null);
    } catch (error) {
      console.error('Error confirming upload:', error);
      toast.error(error.response?.data?.message || 'Failed to create surveillance assignments');
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl bg-white">
          <DialogHeader>
            <DialogTitle>Preview Extracted Data</DialogTitle>
            <DialogDescription>
              Review the extracted surveillance assignments for {selectedTeacher?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="rounded-lg border overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Module</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-500">Room</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {previewAssignments.map((assignment, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {format(new Date(assignment.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="px-4 py-3">{assignment.time}</td>
                      <td className="px-4 py-3">{assignment.module}</td>
                      <td className="px-4 py-3">{assignment.room}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmUpload}
            >
              Confirm & Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 