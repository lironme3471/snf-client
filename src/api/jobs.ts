import { apiFetch } from "./client";
import type {
  CreateJobResponse,
  Job,
  JobInteractionsPage,
} from "../types/api";

export async function createJob(
  token: string,
  zipBlob: Blob
): Promise<CreateJobResponse> {
  const form = new FormData();
  form.append("file", zipBlob, "manifest.zip");
  return apiFetch<CreateJobResponse>("/interaction-ingestion-jobs", token, {
    method: "POST",
    body: form,
    // Content-Type is set automatically by the browser for multipart/form-data
  });
}

export async function getJob(token: string, jobId: string): Promise<Job> {
  return apiFetch<Job>(`/interaction-ingestion-jobs/${jobId}`, token);
}

export async function listJobInteractions(
  token: string,
  jobId: string
): Promise<JobInteractionsPage> {
  return apiFetch<JobInteractionsPage>(
    `/interaction-ingestion-jobs/${jobId}/interactions`,
    token
  );
}
