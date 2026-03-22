import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Plus, Trash2, Upload, BookOpen, Award, FileText, Layers, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type KBItem = {
  id: string;
  title: string;
  category: string;
  content: string;
  tags: string[] | null;
  created_at: string;
};

const CATEGORY_META: Record<string, { label: string; icon: typeof Award }> = {
  case_study: { label: "Case Study", icon: FileText },
  certification: { label: "Certification", icon: Award },
  capability: { label: "Capability", icon: Layers },
  other: { label: "Other", icon: BookOpen },
};

const KnowledgeBase = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<KBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KBItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("case_study");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("user_knowledge_base")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) setItems(data as KBItem[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleSubmit = async () => {
    if (!user || !title.trim() || !content.trim()) {
      toast({ title: "Missing fields", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("user_knowledge_base").insert({
      user_id: user.id,
      title: title.trim(),
      category,
      content: content.trim(),
      tags: tags.trim() ? tags.split(",").map((t) => t.trim()) : null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Asset added" });
      setTitle("");
      setContent("");
      setTags("");
      setCategory("case_study");
      setOpen(false);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("user_knowledge_base").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: "Deleted" });
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "text/plain" || file.name.endsWith(".md") || file.name.endsWith(".txt")) {
        const text = await file.text();
        setTitle(file.name.replace(/\.[^.]+$/, ""));
        setContent(text);
        if (!open) setOpen(true);
        toast({ title: "File loaded", description: `"${file.name}" content loaded into the form.` });
      } else {
        toast({ title: "Unsupported file", description: "Drop a .txt or .md file to auto-fill.", variant: "destructive" });
      }
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-background min-h-screen grain-mesh">
        <div className="container max-w-6xl">
          <Skeleton className="h-10 w-64 mb-3" />
          <Skeleton className="h-4 w-96 mb-10" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <SEO title="Knowledge Base" path="/knowledge-base" description="Manage your certifications, case studies, and company expertise to power AI matching." />
      <section className="py-16 bg-background min-h-screen grain-mesh">
        <div className="container max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
            <div>
              <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground tracking-tight">
                Knowledge Base
              </h1>
              <p className="text-sm text-muted-foreground font-body mt-2 max-w-lg">
                Manage your certifications, case studies, and company expertise to power AI matching.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-accent text-accent-foreground hover:bg-accent/90 gap-2 self-start sm:self-auto">
                  <Plus className="h-4 w-4" /> Upload Asset
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-lg">New Asset</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <Input
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-background border-border font-body text-sm"
                    maxLength={100}
                  />
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-background border-border font-body text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_META).map(([key, { label }]) => (
                        <SelectItem key={key} value={key} className="font-body text-sm">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Content — paste your case study, certification details, or capability description..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="bg-background border-border font-body text-sm min-h-[120px]"
                    maxLength={5000}
                  />
                  <Input
                    placeholder="Tags (comma-separated)"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="bg-background border-border font-body text-sm"
                    maxLength={200}
                  />
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90 font-body text-sm"
                  >
                    {submitting ? "Saving..." : "Save Asset"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`mb-8 rounded-xl border-2 border-dashed transition-all p-8 text-center ${
              dragActive
                ? "border-accent bg-accent/5"
                : "border-border bg-card/30"
            }`}
          >
            <Upload className={`h-6 w-6 mx-auto mb-2 ${dragActive ? "text-accent" : "text-muted-foreground"}`} />
            <p className="text-xs text-muted-foreground font-body">
              Drag &amp; drop a <span className="text-foreground">.txt</span> or <span className="text-foreground">.md</span> file here to auto-fill
            </p>
          </div>

          {/* Bento Grid */}
          {items.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="h-8 w-8 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground font-body">No assets yet. Upload your first one.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {items.map((item, i) => {
                  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.04 }}
                      className="group rounded-xl border border-border bg-card/60 backdrop-blur-sm p-5 flex flex-col justify-between hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <Badge variant="secondary" className="text-[10px] gap-1 font-body uppercase tracking-wider">
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <h3 className="text-sm font-display font-semibold text-foreground mb-1.5 line-clamp-2">
                          {item.title}
                        </h3>
                        <p className="text-xs text-muted-foreground font-body line-clamp-3">
                          {item.content}
                        </p>
                      </div>
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="text-[9px] text-muted-foreground font-body bg-muted px-1.5 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default KnowledgeBase;
