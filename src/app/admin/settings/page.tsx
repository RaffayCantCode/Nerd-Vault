import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function AdminSettings() {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: "global" },
  }).catch(() => null) || { id: "global", heroTitle: "", heroSubtitle: "" };

  async function updateSettings(formData: FormData) {
    "use server";
    const heroTitle = formData.get("heroTitle") as string;
    const heroSubtitle = formData.get("heroSubtitle") as string;

    await prisma.siteSettings.update({
      where: { id: "global" },
      data: { heroTitle, heroSubtitle },
    });

    revalidatePath("/");
    revalidatePath("/admin");
    redirect("/admin");
  }

  return (
    <div className="admin-settings container" style={{ padding: '40px 20px' }}>
      <header style={{ marginBottom: 40 }}>
        <h1 className="headline">Edit Site Settings</h1>
        <p className="copy">Changes here update the homepage in real-time.</p>
      </header>

      <form action={updateSettings} className="glass" style={{ padding: 30, borderRadius: 24, display: 'grid', gap: 20, maxWidth: 600 }}>
        <div className="auth-field">
          <label htmlFor="heroTitle">Hero Title</label>
          <input 
            id="heroTitle" 
            name="heroTitle" 
            type="text" 
            defaultValue={settings.heroTitle || ""} 
            placeholder="Your Universe of Entertainment"
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="heroSubtitle">Hero Subtitle</label>
          <textarea 
            id="heroSubtitle" 
            name="heroSubtitle" 
            defaultValue={settings.heroSubtitle || ""} 
            placeholder="The ultimate platform for tracking..."
            rows={4}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" className="button button-primary">Save Changes</button>
          <a href="/admin" className="button button-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}
