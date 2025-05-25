import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card"
import { Button } from "@/ui/button"
import { Input } from "@/ui/input"
import { Label } from "@/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select"
import { Search, Plus, Edit2, Trash2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/ui/dialog"
import api from '@/utils/axios';
import { toast } from 'react-hot-toast';

export default function ModuleManagement() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpeciality, setSelectedSpeciality] = useState('all');
  const [specialities, setSpecialities] = useState([]);
  const [years, setYears] = useState([]);
  const [paliers, setPaliers] = useState([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [newModule, setNewModule] = useState({
    code: '',
    name: '',
    description: '',
    academicYear: new Date().getFullYear(),
    palierId: '',
    yearId: '',
    specialityId: '',
    semestre: 'SEMESTRE1'
  });

  useEffect(() => {
    fetchModules();
    fetchSpecialities();
    fetchYears();
    fetchPaliers();
  }, []);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/modules');
      if (response.data.success) {
        setModules(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to fetch modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpecialities = async () => {
    try {
      const response = await api.get('/admin/specialities');
      if (response.data.success) {
        setSpecialities(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching specialities:', error);
      toast.error('Failed to fetch specialities');
    }
  };

  const fetchYears = async () => {
    try {
      const response = await api.get('/admin/years');
      if (response.data.success) {
        setYears(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching years:', error);
      toast.error('Failed to fetch years');
    }
  };

  const fetchPaliers = async () => {
    try {
      const response = await api.get('/admin/paliers');
      if (response.data.success) {
        setPaliers(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching paliers:', error);
      toast.error('Failed to fetch paliers');
    }
  };

  const handleAddModule = async () => {
    try {
      const response = await api.post('/admin/modules', newModule);
      if (response.data.success) {
        toast.success('Module added successfully');
        setModules(prev => [...prev, response.data.data]);
        setNewModule({
          code: '',
          name: '',
          description: '',
          academicYear: new Date().getFullYear(),
          palierId: '',
          yearId: '',
          specialityId: '',
          semestre: 'SEMESTRE1'
        });
        setIsAddDialogOpen(false);
      }
    } catch (error) {
      console.error('Error adding module:', error);
      toast.error(error.response?.data?.message || 'Failed to add module');
    }
  };

  const handleEditModule = async () => {
    try {
      const response = await api.put(`/admin/modules/${selectedModule.id}`, selectedModule);
      if (response.data.success) {
        toast.success('Module updated successfully');
        setModules(prev => prev.map(module => 
          module.id === selectedModule.id ? response.data.data : module
        ));
        setIsEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error(error.response?.data?.message || 'Failed to update module');
    }
  };

  const handleDeleteModule = async () => {
    try {
      const response = await api.delete(`/admin/modules/${selectedModule.id}`);
      if (response.data.success) {
        toast.success('Module deleted successfully');
        setModules(prev => prev.filter(module => module.id !== selectedModule.id));
        setIsDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error(error.response?.data?.message || 'Failed to delete module');
    }
  };

  const filteredModules = modules.filter(module => {
    const matchesSearch = 
      module.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      module.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpeciality = selectedSpeciality === 'all' || module.specialityId === parseInt(selectedSpeciality);
    return matchesSearch && matchesSpeciality;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Module Management</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Module
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Module</DialogTitle>
              <DialogDescription>
                Create a new module with its details
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
                <Label htmlFor="description" className="text-right">Description</Label>
                <Input
                  id="description"
                  value={newModule.description}
                  onChange={(e) => setNewModule(prev => ({ ...prev, description: e.target.value }))}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="speciality" className="text-right">Speciality</Label>
                <Select
                  value={newModule.specialityId}
                  onValueChange={(value) => setNewModule(prev => ({ ...prev, specialityId: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select speciality" />
                  </SelectTrigger>
                  <SelectContent>
                    {specialities.map(speciality => (
                      <SelectItem key={speciality.id} value={speciality.id.toString()}>
                        {speciality.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="year" className="text-right">Year</Label>
                <Select
                  value={newModule.yearId}
                  onValueChange={(value) => setNewModule(prev => ({ ...prev, yearId: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year.id} value={year.id.toString()}>
                        {year.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="palier" className="text-right">Palier</Label>
                <Select
                  value={newModule.palierId}
                  onValueChange={(value) => setNewModule(prev => ({ ...prev, palierId: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select palier" />
                  </SelectTrigger>
                  <SelectContent>
                    {paliers.map(palier => (
                      <SelectItem key={palier.id} value={palier.id.toString()}>
                        {palier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="semestre" className="text-right">Semester</Label>
                <Select
                  value={newModule.semestre}
                  onValueChange={(value) => setNewModule(prev => ({ ...prev, semestre: value }))}
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
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleAddModule}>Add Module</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find specific modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="search"
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedSpeciality} onValueChange={setSelectedSpeciality}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Speciality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialities</SelectItem>
                {specialities.map(speciality => (
                  <SelectItem key={speciality.id} value={speciality.id.toString()}>
                    {speciality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modules List</CardTitle>
          <CardDescription>Manage all modules in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-gray-50/50 data-[state=selected]:bg-gray-50">
                  <th className="h-12 px-4 text-left align-middle font-medium">Code</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Speciality</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Year</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Semester</th>
                  <th className="h-12 px-4 text-left align-middle font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                        <span className="ml-2">Loading modules...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-3 text-center">No modules found</td>
                  </tr>
                ) : (
                  filteredModules.map((module) => (
                    <tr key={module.id} className="border-b">
                      <td className="px-4 py-3">{module.code}</td>
                      <td className="px-4 py-3">{module.name}</td>
                      <td className="px-4 py-3">
                        {specialities.find(s => s.id === module.specialityId)?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {years.find(y => y.id === module.yearId)?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-3">{module.semestre}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Module</DialogTitle>
                                <DialogDescription>
                                  Update module details
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                {/* Similar form fields as Add Module dialog */}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleEditModule}>Save Changes</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
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
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Module</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to delete this module? This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteModule}>Delete</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 