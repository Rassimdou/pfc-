import { useEffect, useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/ui/card';
import { Input } from '@/ui/input';
import { Button } from '@/ui/button';
import { BadgeCheck, Lock, Upload, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import UserLayout from './UserLayout';
import api from '@/utils/axios';
import axios from 'axios';
export default function Surveillance() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showSwappableOnly, setShowSwappableOnly] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    fetchAssignments();
    fetchFiles();
  }, []);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/surveillance');
      setAssignments(res.data.data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Erreur lors du chargement des surveillances');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get('/surveillance/files');
      setFiles(res.data.files || []);
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    }
  };

  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.endsWith('.doc')) {
      toast.error('Veuillez sélectionner un fichier .doc');
      return;
    }
    setSelectedFile(file);
  };
  
  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    try {
      await api.post('/surveillance/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Fichier envoyé et traité avec succès');
      fetchFiles();
      fetchAssignments();
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erreur lors de l\'envoi ou du traitement du fichier');
    } finally {
      setUploading(false);
    }
  };

  const filtered = assignments.filter(a => {
    if (showSwappableOnly && (!a.canSwap || a.isResponsible)) return false;
    if (!search) return true;
    return (
      a.module?.toLowerCase().includes(search.toLowerCase()) ||
      a.room?.toLowerCase().includes(search.toLowerCase()) ||
      a.time?.toLowerCase().includes(search.toLowerCase()) ||
      (a.date && new Date(a.date).toLocaleDateString('fr-FR').includes(search))
    );
  });

  return (
    <UserLayout>
      <div className="space-y-8">
        {/* Upload Card */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-4">
            <Upload className="w-8 h-8 text-emerald-600" />
            <div>
              <CardTitle>Ajouter ma convocation de surveillance</CardTitle>
              <CardDescription>Envoyez votre fichier .doc de convocation. Il sera automatiquement analysé et affiché ci-dessous.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept=".doc"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span>Select File</span>
                </label>
                {selectedFile && (
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload & Process'}
                  </Button>
                )}
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="w-4 h-4" />
                  <span>{selectedFile.name}</span>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            {uploading && <span className="text-emerald-600">Envoi et traitement en cours...</span>}
          </CardFooter>
        </Card>

        {/* Uploaded Files List */}
        <Card>
          <CardHeader>
            <CardTitle>Mes fichiers envoyés</CardTitle>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <div className="text-gray-500">Aucun fichier envoyé.</div>
            ) : (
              <ul className="space-y-2">
                {files.map(f => (
                  <li key={f.id} className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline">{f.originalName}</a>
                    <span className="text-xs text-gray-400 ml-2">{f.uploadedAt ? new Date(f.uploadedAt).toLocaleString('fr-FR') : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Assignments Table */}
        <Card>
          <CardHeader>
            <CardTitle>Mes convocations de surveillance</CardTitle>
            <CardDescription>
              Retrouvez ici vos surveillances d'examens. Les surveillances responsables ne sont pas échangeables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <Input
                placeholder="Filtrer par module, salle, date..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="md:w-1/2"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showSwappableOnly}
                  onChange={e => setShowSwappableOnly(e.target.checked)}
                />
                Afficher seulement les surveillances échangeables
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-md">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Heure</th>
                    <th className="px-4 py-2 text-left">Module</th>
                    <th className="px-4 py-2 text-left">Salle</th>
                    <th className="px-4 py-2 text-left">Responsable</th>
                    <th className="px-4 py-2 text-left">Échange</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-4">Chargement...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-4">Aucune surveillance trouvée</td></tr>
                  ) : (
                    filtered.map(a => (
                      <tr key={a.id} className="border-b">
                        <td className="px-4 py-2">{a.date ? new Date(a.date).toLocaleDateString('fr-FR') : ''}</td>
                        <td className="px-4 py-2">{a.time}</td>
                        <td className="px-4 py-2">{a.module}</td>
                        <td className="px-4 py-2">{a.room}</td>
                        <td className="px-4 py-2">
                          {a.isResponsible ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold"><Lock className="w-4 h-4" /> Oui</span>
                          ) : 'Non'}
                        </td>
                        <td className="px-4 py-2">
                          {a.isResponsible ? (
                            <span className="text-gray-400">Non échangeable</span>
                          ) : a.swapWithId ? (
                            <span className="inline-flex items-center gap-1 text-blue-700"><BadgeCheck className="w-4 h-4" />Échangé</span>
                          ) : a.canSwap ? (
                            <Button size="sm" variant="outline" disabled>
                              Demander un échange {/* Placeholder for swap action */}
                            </Button>
                          ) : (
                            <span className="text-gray-400">Non échangeable</span>
                          )}
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
    </UserLayout>
  );
} 