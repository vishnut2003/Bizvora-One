import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const PROJECT_FILE_KINDS = ["upload", "link"] as const;
export type ProjectFileKind = (typeof PROJECT_FILE_KINDS)[number];

const projectFileSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    kind: { type: String, enum: PROJECT_FILE_KINDS, required: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    // Populated for `kind: "upload"` — the full public Vercel Blob URL.
    storagePath: { type: String, trim: true, default: "" },
    originalName: { type: String, trim: true, default: "" },
    contentType: { type: String, trim: true, default: "" },
    size: { type: Number, default: 0, min: 0 },
    // Populated for `kind: "link"`.
    url: { type: String, trim: true, default: "" },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

projectFileSchema.index({ project: 1, createdAt: -1 });

export type IProjectFile = InferSchemaType<typeof projectFileSchema>;

if (process.env.NODE_ENV !== "production" && mongoose.models.ProjectFile) {
  mongoose.deleteModel("ProjectFile");
}

const ProjectFile: Model<IProjectFile> =
  (mongoose.models.ProjectFile as Model<IProjectFile> | undefined) ??
  mongoose.model<IProjectFile>("ProjectFile", projectFileSchema);

export default ProjectFile;
