# Template internal assets

These files are bundled presentation resources owned by a Website Template. They are not Event Media and must never be represented by `MediaAsset`, persisted as Section media, or returned by Event Media APIs.

Each Template owns a manifest with stable semantic keys. Renderer and preview code should resolve assets through `getTemplateAsset` instead of importing file paths throughout JSX. Known manifest keys are checked by TypeScript; dynamic or optional lookups return `undefined` so decoration can be omitted without breaking Website rendering.

Assets with `kind: "demoPhoto"` are preview-only. They may be used by an explicitly identified chooser, starter visualization, or development surface, but must not be used as published content or mutate a Website draft. Replacing demo media requires a normal Event Media assignment.

Third-party assets must record their source and applicable licensing fields in `provenance`. Assets created for this repository use `source: "owned"` and may omit external licensing fields.
