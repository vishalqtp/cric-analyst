import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadFolderComponent } from './upload-folder.component';

describe('UploadFolderComponent', () => {
  let component: UploadFolderComponent;
  let fixture: ComponentFixture<UploadFolderComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UploadFolderComponent]
    });
    fixture = TestBed.createComponent(UploadFolderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
