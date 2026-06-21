// Browser shim for @tauri-apps/api/menu. Native menus don't exist in the PWA.
class StubMenuItem {
  static async new(options?: unknown): Promise<StubMenuItem> {
    return new StubMenuItem(options);
  }
  constructor(public options?: unknown) {}
  async setText(_t: string): Promise<void> {}
  async setEnabled(_b: boolean): Promise<void> {}
}

class StubMenu {
  static async new(options?: unknown): Promise<StubMenu> {
    return new StubMenu(options);
  }
  items: unknown[] = [];
  constructor(public options?: unknown) {}
  async append(_item: unknown): Promise<void> {}
  async popup(_position?: unknown): Promise<void> {}
  async setAsAppMenu(): Promise<void> {}
}

class StubPredefinedMenuItem {
  static async new(options?: unknown): Promise<StubPredefinedMenuItem> {
    return new StubPredefinedMenuItem(options);
  }
  constructor(public options?: unknown) {}
}

class StubSubmenu {
  static async new(options?: unknown): Promise<StubSubmenu> {
    return new StubSubmenu(options);
  }
  constructor(public options?: unknown) {}
  async append(_item: unknown): Promise<void> {}
}

class StubCheckMenuItem {
  static async new(options?: unknown): Promise<StubCheckMenuItem> {
    return new StubCheckMenuItem(options);
  }
  constructor(public options?: unknown) {}
}

export const Menu = StubMenu;
export const MenuItem = StubMenuItem;
export const PredefinedMenuItem = StubPredefinedMenuItem;
export const Submenu = StubSubmenu;
export const CheckMenuItem = StubCheckMenuItem;
