import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';

@Component({
  selector: 'app-upload-folder',
  templateUrl: './upload-folder.component.html',
  styleUrls: ['./upload-folder.component.scss']
})
export class UploadFolderComponent {
  selectedFiles: File[] = [];

  constructor(private http: HttpClient) {}

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    this.selectedFiles = Array.from(files);
    console.log('Selected files:', this.selectedFiles);
  }

  // uploadFiles() {
  //   if(this.selectedFiles.length === 0) {
  //     alert('Please select files first.');
  //     return;
  //   }
  //   const formData = new FormData();
  //   this.selectedFiles.forEach(file => {
  //     formData.append('files', file, file.name);  // Use file.name here!
  //   });

  //   this.http.post('http://localhost:5017/api/Upload/folder', formData).subscribe({
  //     next: res => console.log('Upload success', res),
  //     error: err => console.error('Upload failed', err)
  //   });
  // }

  async uploadFiles() {
  if (this.selectedFiles.length === 0) {
    alert('Please select files first.');
    return;
  }

  const batchSize = 50;

  for (let i = 0; i < this.selectedFiles.length; i += batchSize) {
    const batchFiles = this.selectedFiles.slice(i, i + batchSize);

    const formData = new FormData();
    batchFiles.forEach(file => formData.append('files', file, file.name)); // Use file.name here

    try {
      const res = await this.http.post('http://localhost:5017/api/Upload/folder', formData).toPromise();
      console.log(`Batch ${Math.floor(i / batchSize) + 1} upload success`, res);
    } catch (err) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} upload failed`, err);
      alert('Upload failed, stopping further uploads.');
      break;
    }
  }
}

}
