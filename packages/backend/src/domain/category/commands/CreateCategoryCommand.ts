export interface CreateCategoryCommand {
  readonly type: 'CreateCategoryCommand';
  readonly payload: {
    readonly name: string;
    readonly icon: string;
    readonly color: string;
    readonly isDefault: boolean;
  };
}
