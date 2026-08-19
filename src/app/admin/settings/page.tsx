import { getSiteSettings, updateSiteSettings } from "@/lib/vault-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function AdminSettings() {
  const settings = await getSiteSettings();

  async function updateSettings(formData: FormData) {
    "use server";
    const heroTitle = formData.get("heroTitle") as string;
    const heroSubtitle = formData.get("heroSubtitle") as string;

    await updateSiteSettings(heroTitle, heroSubtitle);

    revalidatePath("/");
    revalidatePath("/admin");
    redirect("/admin");
  }

  return (
    <div className="admin-page">
      <div className="admin-page-shell">
        <header className="admin-hero">
          <p className="eyebrow">Admin settings</p>
          <h1 className="headline">Edit Brand Messaging</h1>
          <p className="copy">These fields control the landing hero headline and supporting brand statement.</p>
        </header>

        <form action={updateSettings} className="glass admin-form">
          <div className="admin-form-fields">
            <label className="field" htmlFor="heroTitle">
              <span className="eyebrow">Hero Headline</span>
              <input
                id="heroTitle"
                name="heroTitle"
                type="text"
                defaultValue={settings.hero_title || ""}
                placeholder="Your world of entertainment. Organized."
              />
            </label>

            <label className="field" htmlFor="heroSubtitle">
              <span className="eyebrow">Hero Supporting Copy</span>
              <textarea
                id="heroSubtitle"
                name="heroSubtitle"
                defaultValue={settings.hero_subtitle || ""}
                placeholder="Track, discover, and organize movies, shows, anime, and games in one vault."
                rows={4}
              />
            </label>
          </div>

          <div className="admin-form-actions">
            <button type="submit" className="button button-primary">Save Changes</button>
            <a href="/admin" className="button button-secondary">Cancel</a>
          </div>
        </form>
      </div>
    </div>
  );
}
