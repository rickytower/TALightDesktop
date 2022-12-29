import { Component, ElementRef, EventEmitter, Input, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { removeFileDecorator } from 'indexeddb-fs/dist/framework/parts';
import { ConfirmationService } from 'primeng/api';
import { OverlayPanel } from 'primeng/overlaypanel';

export interface TalFile {
  name: string;
  content: string;
}

export interface TalFolder {
  name: string;
  folders: TalFolder[];
  files: TalFile[];
}

@Component({
  selector: 'tal-editor-files-widget',
  templateUrl: './editor-files-widget.component.html',
  styleUrls: ['./editor-files-widget.component.scss']
})
export class EditorFilesWidgetComponent implements OnInit {
  @Input("root") root: TalFolder =
    {
      name: "src",
      folders: [
        {
          name: "app",
          folders: [
            {
              name: "widgets",
              folders: [
                {
                  name: "code-editor-test-nome-lungo",
                  folders: [],
                  files: [
                    {
                      name: "editor-files-widget",
                      content: "content"
                    }
                  ]
                }
              ],
              files: []
            }
          ],
          files: [
            {
              name: "app.component.ts",
              content: "content"
            },
            {
              name: "app.module.ts",
              content: "content"
            },
          ]
        }
      ],
      files: [
        {
          name: "main.ts",
          content: "content"
        }
      ]
    };

  public editingValue: string = "";
  public editingItem: TalFile | TalFolder | null = null;
  public editingItemFolder: TalFolder | null = null;
  public editingItemError: boolean = false;

  public newItemValue: string = "";
  public newItemType: "file" | "folder" = "file";
  public newItemFolder: TalFolder | null = null;
  public newItemError: boolean = false;

  public openedFile: TalFile | null = null;

  @ViewChild("nameEditing") public nameEditingElement?: ElementRef;
  @ViewChild("newItemName") public newItemNameElement?: ElementRef;

  @ViewChildren(OverlayPanel) public panels?: QueryList<OverlayPanel>;

  @Output("change") public change: EventEmitter<TalFolder> = new EventEmitter<TalFolder>();
  @Output("open") public open: EventEmitter<TalFile> = new EventEmitter<TalFile>();

  constructor(private confirmationService: ConfirmationService) { }

  ngOnInit() {
    this.bindCollapseEvent();
  }

  private bindCollapseEvent() {
    setTimeout(() => {
      const rows = document.getElementsByClassName("collapse-toggle");
      for (let i = 0; i < rows.length; i++) {
        if (!rows[i].classList.contains("bound")) {
          rows[i].addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const row = e.target as HTMLElement;
            let newParent: HTMLElement = row;
            let safeCount = 0;
            do {
              newParent = newParent.parentElement as HTMLElement;
              safeCount++;
            } while (!newParent.classList.contains("tal-folder-subtree") && safeCount < 10);

            if (safeCount < 10) {
              newParent.classList.toggle("collapsed");
            }
          });

          rows[i].classList.add("bound");
        }
      }
    }, 0);
  }

  public closeAllContextMenus(event: Event) {
    event.preventDefault();
    if (this.panels) {
      this.panels.forEach(p => p.hide());
    }
  }

  public openFile(file: TalFile) {
    this.openedFile = file;
    this.open?.emit(file);
  }

  /** EDITING METHODS  **/
  public startEditing(folder: TalFolder, item: TalFile | TalFolder) {
    this.editingItem = item;
    this.editingValue = item.name;
    this.editingItemFolder = folder;
    this.editingItemError = false;

    setTimeout(() => {
      if (this.nameEditingElement) {
        this.nameEditingElement.nativeElement.focus();
      }
    }, 0);
  }

  public saveEditing() {
    if (!this.editingItemError) {
      if (this.editingItem) {
        this.editingValue = this.editingValue.trim();
        if (this.editingValue.length > 0) {
          this.editingItem.name = this.editingValue;

          this.change?.emit(this.root);
        }
      }
    }
    this.cancelEditing();
  }

  public cancelEditing() {
    this.editingItem = null;
    this.editingValue = "";
    this.editingItemFolder = null;
  }

  public editItemChange() {
    this.editingItemError = false;

    if (this.editingItemFolder) {
      const existingFile = this.editingItemFolder.files.find(f => f.name === this.editingValue);
      const existingFolder = this.editingItemFolder.folders.find(f => f.name === this.editingValue);
      if (existingFile || existingFolder) {
        this.editingItemError = true;
      }
    }
  }
  /***************/

  /** DELETE METHODS **/
  public deleteFileClick(event: Event, file: TalFile) {
    if (event.target) {
      this.confirmationService.confirm({
        target: event.target,
        message: 'Sei sicuro di voler eliminare questo file?',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          //confirm action
          this.deleteFile(this.root, file);
        },
        reject: () => {
          //reject action
        }
      });
    }
  }

  private deleteFile(currentFolder: TalFolder, file: TalFile) {
    if (currentFolder.files.indexOf(file) >= 0) {
      currentFolder.files.splice(currentFolder.files.indexOf(file), 1);
      this.change?.emit(this.root);
    } else {
      for (let i = 0; i < currentFolder.folders.length; i++) {
        const folder: TalFolder = currentFolder.folders[i];
        this.deleteFile(folder, file);
      }
    }
  }

  public deleteFolderClick(event: Event, folder: TalFolder) {
    if (event.target) {
      this.confirmationService.confirm({
        target: event.target,
        message: 'Sei sicuro di voler eliminare questa cartella? Tutti i file e le cartelle contenute verranno eliminate.',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          //confirm action
          this.deleteFolder(this.root, folder);
        },
        reject: () => {
          //reject action
        }
      });
    }
  }

  private deleteFolder(currentFolder: TalFolder, folder: TalFolder) {
    if (currentFolder.folders.indexOf(folder) >= 0) {
      currentFolder.folders.splice(currentFolder.folders.indexOf(folder), 1);
      this.change?.emit(this.root);
    } else {
      for (let i = 0; i < currentFolder.folders.length; i++) {
        const subFolder: TalFolder = currentFolder.folders[i];
        this.deleteFolder(subFolder, folder);
      }
    }
  }
  /***************/

  /** CREATE METHODS **/
  public addNewItem(folder: TalFolder, type: "file" | "folder") {
    this.newItemValue = "";
    this.newItemFolder = folder;
    this.newItemType = type;
    this.newItemError = false;

    setTimeout(() => {
      if (this.newItemNameElement) {
        this.newItemNameElement.nativeElement.focus();
      }
    }, 0);
  }

  public cancelNewItem() {
    this.newItemValue = "";
    this.newItemFolder = null;
  }

  public saveNewItem() {
    if (!this.newItemError) {
      this.newItemValue = this.newItemValue.trim();
      if (this.newItemValue.length > 0) {
        if (this.newItemFolder) {
          if (this.newItemType === "file") {
            this.newItemFolder.files.push({
              name: this.newItemValue,
              content: ""
            });
          } else {
            this.newItemFolder.folders.push({
              name: this.newItemValue,
              files: [],
              folders: []
            });

            this.bindCollapseEvent();
          }

          this.change?.emit(this.root);
        }
      }
    }

    this.newItemValue = "";
    this.newItemFolder = null;
  }

  public newItemChange() {
    this.newItemError = false;

    if (this.newItemFolder) {
      const existingFile = this.newItemFolder.files.find(f => f.name === this.newItemValue);
      const existingFolder = this.newItemFolder.folders.find(f => f.name === this.newItemValue);
      if (existingFile || existingFolder) {
        this.newItemError = true;
      }
    }
  }
  /***************/

  public export() {
    // TODO: export
  }
}
