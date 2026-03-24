import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import api from "@/lib/api";
import { format } from "date-fns";
import { FileText, Download, Trash2, Upload, Edit2, FileUp, CheckCircle, XCircle, Image, X } from "lucide-react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

const resourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetAudience: z.enum(["TRAINING_COORDINATORS", "ALL_USERS"]),
  status: z.enum(["DRAFT", "PUBLISHED"]),
});

type ResourceFormData = z.infer<typeof resourceSchema>;

interface Resource {
  id: string;
  title: string;
  description: string | null;
  fileName: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  imageUrl: string | null;
  imageName: string | null;
  imageSize: number | null;
  status: "DRAFT" | "PUBLISHED" | "DELETED";
  targetAudience: "TRAINING_COORDINATORS" | "ALL_USERS";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  uploader?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [hadImageAtEditStart, setHadImageAtEditStart] = useState(false);
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { ability } = useAuth();

  // Check permissions
  const canCreate = ability?.can("create", "ResourceLibrary") ?? false;
  const canEdit = ability?.can("edit", "ResourceLibrary") ?? false;
  const canDelete = ability?.can("delete", "ResourceLibrary") ?? false;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ResourceFormData>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      targetAudience: "TRAINING_COORDINATORS",
      status: "DRAFT",
    },
  });

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      const response = await api.resourceLibraryApi.getAll({
        sortBy: "createdAt",
        sortOrder: "desc",
      });
      setResources(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch resources",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file type",
          description: "Only PDF files are allowed",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast({
          title: "Invalid image type",
          description: "Only JPG, PNG, GIF and WebP images are allowed",
          variant: "destructive",
        });
        e.target.value = "";
        return;
      }
      setSelectedImage(file);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    setExistingImageUrl(null);
    const imgInput = document.getElementById("resource-image") as HTMLInputElement;
    if (imgInput) imgInput.value = "";
  };

  const onSubmit = async (data: ResourceFormData) => {
    if (!selectedFile && !editingId) {
      toast({
        title: "Error",
        description: "Please select a PDF file to upload",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("title", data.title);
      formData.append("description", description || "");
      formData.append("targetAudience", data.targetAudience);
      formData.append("status", data.status);

      if (selectedFile) {
        formData.append("pdf", selectedFile);
      }
      if (selectedImage) {
        formData.append("coverImage", selectedImage);
      }
      if (editingId && hadImageAtEditStart && !existingImageUrl && !selectedImage) {
        formData.append("clearCoverImage", "1");
      }

      if (editingId) {
        await api.resourceLibraryApi.update(editingId, formData);
        toast({ title: "Success", description: "Resource updated successfully" });
      } else {
        await api.resourceLibraryApi.create(formData);
        toast({ title: "Success", description: "Resource uploaded successfully" });
      }

      // Reset form
      reset();
      setDescription("");
      setSelectedFile(null);
      setSelectedImage(null);
      setExistingImageUrl(null);
      setHadImageAtEditStart(false);
      setEditingId(null);
      const fileInput = document.getElementById("pdf-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      const imgInput = document.getElementById("resource-image") as HTMLInputElement;
      if (imgInput) imgInput.value = "";

      fetchResources();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save resource",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setValue("title", resource.title);
    setValue("targetAudience", resource.targetAudience);
    setValue("status", resource.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT");
    setDescription(resource.description || "");
    setSelectedFile(null);
    setSelectedImage(null);
    setExistingImageUrl(resource.imageUrl || null);
    setHadImageAtEditStart(!!resource.imageUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset();
    setDescription("");
    setSelectedFile(null);
    setSelectedImage(null);
    setExistingImageUrl(null);
    setHadImageAtEditStart(false);
    const fileInput = document.getElementById("pdf-file") as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    const imgInput = document.getElementById("resource-image") as HTMLInputElement;
    if (imgInput) imgInput.value = "";
  };

  const handleToggleStatus = async (resource: Resource) => {
    try {
      const newStatus = resource.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
      await api.resourceLibraryApi.updateStatus(resource.id, newStatus);
      toast({
        title: "Success",
        description: `Resource ${newStatus === "PUBLISHED" ? "published" : "set to draft"}`,
      });
      fetchResources();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this resource?")) return;
    try {
      await api.resourceLibraryApi.delete(id);
      toast({ title: "Success", description: "Resource removed successfully" });
      fetchResources();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove resource",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (resource: Resource) => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    const baseUrl = apiUrl.replace("/api", "");
    const fullUrl = `${baseUrl}${resource.fileUrl}`;
    window.open(fullUrl, "_blank");
  };

  const getImageSrc = (imageUrl: string) => {
    if (!imageUrl) return "";
    if (imageUrl.startsWith("http")) return imageUrl;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
    return `${apiUrl.replace("/api", "")}${imageUrl}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ list: "ordered" }, { list: "bullet" }],
      [{ indent: "-1" }, { indent: "+1" }],
      ["link"],
      ["clean"],
    ],
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Resource Library</h1>
      </div>

      {/* Upload / Edit Form */}
      {(canCreate || canEdit) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5" />
              {editingId ? "Edit Resource" : "Upload New Resource"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Content Title <span className="text-red-500">*</span>
                  </Label>
                  <Input id="title" {...register("title")} placeholder="Enter title" />
                  {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
                </div>

                {/* PDF File */}
                <div className="space-y-2">
                  <Label htmlFor="pdf-file">PDF File {!editingId && <span className="text-red-500">*</span>}</Label>
                  <Input id="pdf-file" type="file" accept=".pdf,application/pdf" onChange={handleFileChange} />
                  {selectedFile && (
                    <p className="text-sm text-gray-500">
                      Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                    </p>
                  )}
                </div>

                {/* Target Audience */}
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">
                    Target Audience <span className="text-red-500">*</span>
                  </Label>
                  <Select onValueChange={(value) => setValue("targetAudience", value as any)} defaultValue="TRAINING_COORDINATORS">
                    <SelectTrigger>
                      <SelectValue placeholder="Select audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRAINING_COORDINATORS">For Training Coordinators</SelectItem>
                      <SelectItem value="ALL_USERS">All Users</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <Label htmlFor="status">
                    Status <span className="text-red-500">*</span>
                  </Label>
                  <Select onValueChange={(value) => setValue("status", value as any)} defaultValue="DRAFT">
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="PUBLISHED">Published</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="resource-image">Cover Image (Optional)</Label>
                <p className="text-xs text-gray-500">Upload a cover/thumbnail image for this resource. Accepted formats: JPG, PNG, GIF, WebP.</p>

                {/* Show existing image preview when editing */}
                {(existingImageUrl || selectedImage) && (
                  <div className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
                    <div className="relative">
                      <img
                        src={selectedImage ? URL.createObjectURL(selectedImage) : getImageSrc(existingImageUrl!)}
                        alt="Cover preview"
                        className="h-20 w-32 object-cover rounded border"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      {selectedImage ? (
                        <p className="text-sm font-medium text-gray-700 truncate">{selectedImage.name}</p>
                      ) : (
                        <p className="text-sm text-gray-500">Current image</p>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="mt-1 text-red-500 hover:text-red-700 h-auto p-0" onClick={handleClearImage}>
                        <X className="h-4 w-4 mr-1" />
                        Remove image
                      </Button>
                    </div>
                  </div>
                )}

                {!existingImageUrl && !selectedImage && (
                  <div className="flex items-center gap-2">
                    <Input id="resource-image" type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageChange} />
                  </div>
                )}

                {(existingImageUrl || selectedImage) && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="resource-image" className="text-sm text-gray-600 cursor-pointer underline">
                      Change image
                    </Label>
                    <Input
                      id="resource-image"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>
                )}
              </div>

              {/* Description - Rich Text */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  modules={quillModules}
                  placeholder="Enter description..."
                  className="bg-white"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      {editingId ? "Updating..." : "Uploading..."}
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {editingId ? "Update Resource" : "Upload Resource"}
                    </>
                  )}
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Resources Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Published Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No resources found. Upload your first resource above.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Cover</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Upload Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Target Audience</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        {resource.imageUrl ? (
                          <img src={getImageSrc(resource.imageUrl)} alt={resource.title} className="h-10 w-14 object-cover rounded border" />
                        ) : (
                          <div className="h-10 w-14 flex items-center justify-center bg-gray-100 rounded border">
                            <Image className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{resource.title}</TableCell>
                      <TableCell>
                        <div
                          className="max-w-xs truncate text-sm text-gray-600"
                          dangerouslySetInnerHTML={{
                            __html: resource.description || "No description",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-red-500" />
                          <span className="text-sm">{resource.fileName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(resource.createdAt), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            resource.status === "PUBLISHED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {resource.status === "PUBLISHED" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                          {resource.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{resource.targetAudience === "TRAINING_COORDINATORS" ? "Training Coordinators" : "All Users"}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Download is always available */}
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(resource)} title="Download">
                            <Download className="h-4 w-4" />
                          </Button>

                          {/* Edit button - only if user has edit permission */}
                          {canEdit && (
                            <Button variant="ghost" size="sm" onClick={() => handleEdit(resource)} title="Edit">
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Status toggle - only if user has edit permission */}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(resource)}
                              title={resource.status === "PUBLISHED" ? "Set to Draft" : "Publish"}
                            >
                              {resource.status === "PUBLISHED" ? (
                                <XCircle className="h-4 w-4 text-yellow-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              )}
                            </Button>
                          )}

                          {/* Delete button - only if user has delete permission */}
                          {canDelete && (
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(resource.id)} title="Remove">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
