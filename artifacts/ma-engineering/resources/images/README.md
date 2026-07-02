# Resources / Images

Drop any photos, logos, site images, or reference assets here (e.g. `logo.png`, `site-photo-1.jpg`).

This folder is just for storage/reference — it is not wired into the app automatically.
To actually use an image in a screen, move/copy it into `assets/images/` and import it, e.g.:

```tsx
<Image source={require("@/assets/images/your-photo.png")} />
```

Keeping uploads here first keeps the main `assets/images/` folder clean and lets us decide where each photo should be used.
