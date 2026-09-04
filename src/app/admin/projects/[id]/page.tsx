"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { toNum } from "@/lib/utils";
import { toast } from "@/lib/toast";
import { describeDbError, updateTolerant } from "@/lib/db";
import {
  depositAmountOf,
  depositFieldsFor,
  depositPercentOf,
  phaseAmountOf,
  phasePercentOf,
  roundCents,
  syncPhaseAmounts,
  totalScheduledAmount,
  totalScheduledPercent,
  amountToPercent,
  displayPercent,
} from "@/lib/payment-schedule";
import { formatChangeOrderNumber } from "@/lib/document-numbers";
import {
  applyScopeAmendment,
  groupItemsByCategory,
  midCostOf,
  orderItemsByCategory,
  type ScopeOperationPreview,
} from "@/lib/scope-amendment";

export default function ProjectWorkspaceControlHub() {
  const router = useRouter();
  const params = useParams();
  
  // Cleanly extract the dynamic route ID parameter using next/navigation's native client hook
  const projectId = params?.id as string;

  // Core Data States
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Client Profile Editing States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editProjectTitle, setEditProjectTitle] = useState("");

  // Line Item Insertion States
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newMidDescription, setNewMidDescription] = useState("");
  const [newMidCost, setNewMidCost] = useState("");
  const [newHighTitle, setNewHighTitle] = useState("");
  const [newHighDescription, setNewHighDescription] = useState("");
  const [newHighCost, setNewHighCost] = useState("");

  // Field Operations Log States
  const [dailyNotes, setDailyNotes] = useState("");
  const [attachedPhotoBase64, setAttachedPhotoBase64] = useState("");
  const [attachedPhotoName, setAttachedPhotoName] = useState("");
  const [isLogging, setIsLogging] = useState(false);
  const [attachedPhotoFile, setAttachedPhotoFile] = useState<File | null>(null);

  // Q&A Messaging States
  const [qaMessage, setQaMessage] = useState("");
  const [isSendingQa, setIsSendingQa] = useState(false);
  const [editingQaIndex, setEditingQaIndex] = useState<number | null>(null);
  const [editingQaText, setEditingQaText] = useState("");
  const [qaAttachment, setQaAttachment] = useState<{ file: File; preview: string } | null>(null);

  // Document Upload States
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Email States
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Payment Reminder States
  const [sendingReminderIdx, setSendingReminderIdx] = useState<number | null>(null);
  const [depositPreviewHtml, setDepositPreviewHtml] = useState<string | null>(null);
  const [isSendingDeposit, setIsSendingDeposit] = useState(false);

  // Selections Manager States
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingChoiceIdx, setAddingChoiceIdx] = useState<number | null>(null);
  const [newChoiceText, setNewChoiceText] = useState("");
  const [newChoiceImageUrl, setNewChoiceImageUrl] = useState("");
  const [newChoiceProductUrl, setNewChoiceProductUrl] = useState("");
  const [editingCategoryIdx, setEditingCategoryIdx] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [isSendingSelectionReminder, setIsSendingSelectionReminder] = useState(false);
  const [scanningIdx, setScanningIdx] = useState<number | null>(null);
  const [scanStep, setScanStep] = useState<{ gIdx: number; files: File[] } | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const [librarySearchIdx, setLibrarySearchIdx] = useState<number | null>(null);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [libraryResults, setLibraryResults] = useState<any[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const libraryTimerRef = useRef<any>(null);

  // Contractor Notes States
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Change Order States
  const [coDescription, setCoDescription] = useState("");
  const [coItems, setCoItems] = useState<any[]>([]);
  const [isGeneratingCo, setIsGeneratingCo] = useState(false);
  const [isDeployingCo, setIsDeployingCo] = useState(false);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);

  // AI Scope Amendment States
  const [amendRequest, setAmendRequest] = useState("");
  const [isAnalyzingAmendment, setIsAnalyzingAmendment] = useState(false);
  const [amendment, setAmendment] = useState<any>(null);
  const [rejectedOps, setRejectedOps] = useState<number[]>([]);
  const [isApplyingAmendment, setIsApplyingAmendment] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchComprehensiveProjectData();
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("invoices")
        .select("questions")
        .eq("id", projectId)
        .single();
      if (data?.questions) {
        setProject((prev: any) => prev ? { ...prev, questions: data.questions } : prev);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [projectId]);

  async function fetchComprehensiveProjectData() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", projectId)
        .single();

      if (error) throw error;
      if (data) {
        setProject(data);
        setEditName(data.homeowner_name || "");
        setEditEmail(data.homeowner_email || "");
        setEditPhone(data.homeowner_phone || "");
        setEditAddress(data.job_address || "");
        setEditProjectTitle(data.project_title || "");
      }

      const { data: cos } = await supabase
        .from("invoices")
        .select("*")
        .eq("parent_id", projectId)
        .order("created_at", { ascending: true });
      if (cos) setChangeOrders(cos);
    } catch (err) {
      console.error("Error retrieving database record profiles:", err);
    } finally {
      setLoading(false);
    }
  }

  async function saveClientProfileModifications() {
    setIsSaving(true);
    try {
      const updates = {
        homeowner_name: editName.trim(),
        homeowner_email: editEmail.trim(),
        homeowner_phone: editPhone.trim(),
        job_address: editAddress.trim(),
        project_title: editProjectTitle.trim()
      };

      const { error, dropped } = await updateTolerant(
        supabase,
        "invoices",
        updates,
        (q) => q.eq("id", projectId),
        "id"
      );

      if (error) throw error;
      if (dropped.length > 0) {
        toast(`Couldn't save ${dropped.join(", ")} — run the latest migration in Supabase.`, "error");
      }

      setProject((prev: any) => ({ ...prev, ...updates }));

      setIsEditModalOpen(false);
      toast("Client profile updated successfully", "success");
    } catch (err: any) {
      toast("Profile update failed: " + err.message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function markDeclined() {
    if (!confirm("Mark this proposal as declined?")) return;
    try {
      await supabase.from("invoices").update({ status: "declined" }).eq("id", projectId);
      setProject((prev: any) => prev ? { ...prev, status: "declined" } : prev);
      toast("Proposal marked as declined", "success");
    } catch (err: any) {
      toast("Failed to update status: " + err.message, "error");
    }
  }

  async function reopenProposal() {
    if (!confirm("Reopen this proposal as pending?")) return;
    try {
      await supabase.from("invoices").update({ status: "sent" }).eq("id", projectId);
      setProject((prev: any) => prev ? { ...prev, status: "sent" } : prev);
      toast("Proposal reopened", "success");
    } catch (err: any) {
      toast("Failed to update status: " + err.message, "error");
    }
  }

  async function sendProposalEmail() {
    if (!project?.homeowner_email) return toast("No email on file — add one in the client profile.", "error");
    if (!confirm(`Send proposal to ${project.homeowner_email}?`)) return;
    setIsSendingEmail(true);
    try {
      const res = await fetch("/api/send-proposal-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_id: projectId,
          base_url: window.location.origin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      toast(`Proposal sent to ${data.sent_to}`, "success");
      fetchComprehensiveProjectData();
    } catch (err: any) {
      toast("Email failed: " + err.message, "error");
    } finally {
      setIsSendingEmail(false);
    }
  }

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function flushPendingDebounce() {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
  }

  async function saveGlobalScopeItemChanges(updatedItems: any[]) {
    const isApproved = project?.status === "approved";
    const calculatedNewTotal = roundCents(
      isApproved
        ? updatedItems.reduce((sum, item) => sum + toNum(item.actual_cost ?? item.cost ?? item.mid_cost), 0)
        : updatedItems.reduce((sum, item) => sum + toNum(item.mid_cost), 0)
    );

    // The deposit and every draw are percentages of the contract, so a change to
    // the line items has to carry through to their dollar figures in the same
    // write. Skipping this is what left a schedule whose percentages summed to
    // 100% while its amounts still added up to the previous total.
    const depositFields = depositFieldsFor(depositPercentOf(project, calculatedNewTotal), calculatedNewTotal);
    const syncedPhases = syncPhaseAmounts(project?.payment_phases, calculatedNewTotal);

    setProject((prev: any) => ({
      ...prev,
      items: updatedItems,
      amount: calculatedNewTotal,
      ...depositFields,
      payment_phases: syncedPhases,
    }));

    try {
      const { data, error, dropped } = await updateTolerant(
        supabase,
        "invoices",
        {
          items: updatedItems,
          amount: calculatedNewTotal,
          payment_phases: syncedPhases,
          ...depositFields,
        },
        (q: any) => q.eq("id", projectId),
        "*"
      );

      if (error) throw new Error(describeDbError(error));

      if (!data) {
        throw new Error("Update affected 0 rows — RLS may be blocking writes. Check Supabase RLS policies on the invoices table.");
      }

      if (dropped.length > 0) {
        console.warn(`[invoices] scope saved without ${dropped.join(", ")} — column missing from the table.`);
      }

      setProject((prev: any) => ({
        ...prev,
        items: data.items,
        amount: data.amount,
        payment_phases: data.payment_phases ?? syncedPhases,
        deposit_percentage: data.deposit_percentage ?? depositFields.deposit_percentage,
        deposit_amount: data.deposit_amount ?? depositFields.deposit_amount,
      }));
    } catch (err: any) {
      toast("Error saving: " + err.message, "error");
      fetchComprehensiveProjectData();
    }
  }

  // ── Deposit & draw schedule ───────────────────────────────────────────
  // Percentages are what get stored. Dollar figures are mirrored alongside them
  // so anything reading the row directly still sees a sensible number, but they
  // are always recomputed — never trusted — on the way back out.

  /**
   * Writes go through updateTolerant and check that a row actually changed.
   * The old handler did a bare update with no row check, so when deposit_amount
   * was missing from the table the whole statement failed and took
   * deposit_percentage down with it — the admin showed the new percentage while
   * the database and the homeowner portal kept the old one.
   */
  async function persistProjectFields(fields: Record<string, any>, label: string): Promise<boolean> {
    const { data, error, dropped } = await updateTolerant(
      supabase,
      "invoices",
      fields,
      (q: any) => q.eq("id", projectId),
      "id"
    );

    if (error) {
      toast(`Failed to save ${label}: ${describeDbError(error)}`, "error");
      return false;
    }

    if (!data) {
      toast(
        `${label} did not save — the update changed no rows. Check the RLS policies on the invoices table.`,
        "error"
      );
      return false;
    }

    if (dropped.length > 0) {
      console.warn(`[invoices] ${label} saved without ${dropped.join(", ")} — column missing from the table.`);
    }

    return true;
  }

  async function saveDeposit() {
    const total = toNum(project?.amount);
    const fields = depositFieldsFor(depositPercentOf(project, total), total);
    // The deposit is draw #1, so it moves with it.
    const syncedPhases = syncPhaseAmounts(project?.payment_phases, total);

    const ok = await persistProjectFields(
      { ...fields, payment_phases: syncedPhases },
      "deposit"
    );
    if (ok) setProject((prev: any) => ({ ...prev, ...fields, payment_phases: syncedPhases }));
  }

  async function savePhases(phases: any[]) {
    const total = toNum(project?.amount);
    const synced = syncPhaseAmounts(phases, total);
    setProject((prev: any) => ({ ...prev, payment_phases: synced }));
    await persistProjectFields({ payment_phases: synced }, "payment schedule");
  }

  // ── AI Scope Amendment ────────────────────────────────────────────────
  // The contractor types what they want to add; the AI decides whether each
  // piece folds into a line that already exists or needs one of its own. It
  // only ever *proposes* — nothing reaches the ledger until the changes below
  // are reviewed and applied.

  async function analyzeScopeAmendment() {
    if (!amendRequest.trim()) {
      return toast("Describe what you'd like to add to this proposal.", "info");
    }

    setIsAnalyzingAmendment(true);
    setAmendment(null);
    setRejectedOps([]);

    try {
      const res = await fetch("/api/amend-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoice_id: projectId, request: amendRequest.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scope analysis failed");

      setAmendment(data);
      toast(`${data.previews.length} scope change${data.previews.length === 1 ? "" : "s"} proposed`, "success");
    } catch (err: any) {
      toast(err.message || "Scope analysis failed", "error");
    } finally {
      setIsAnalyzingAmendment(false);
    }
  }

  function toggleAmendmentOp(idx: number) {
    setRejectedOps((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]));
  }

  function discardAmendment() {
    setAmendment(null);
    setRejectedOps([]);
  }

  const acceptedPreviews: ScopeOperationPreview[] = amendment
    ? amendment.previews.filter((_: any, idx: number) => !rejectedOps.includes(idx))
    : [];
  const acceptedMidDelta = acceptedPreviews.reduce((sum, p) => sum + toNum(p.mid_delta), 0);

  async function applyAcceptedAmendment() {
    if (acceptedPreviews.length === 0) return toast("No changes selected to apply.", "info");

    setIsApplyingAmendment(true);
    flushPendingDebounce();

    try {
      const currentItems = Array.isArray(project?.items) ? project.items : [];
      const accepted = amendment.operations.filter((_: any, idx: number) => !rejectedOps.includes(idx));
      const nextItems = applyScopeAmendment(currentItems, accepted, amendment.category_order || []);

      await saveGlobalScopeItemChanges(nextItems);

      setAmendment(null);
      setRejectedOps([]);
      setAmendRequest("");
      toast(`Applied ${accepted.length} scope change${accepted.length === 1 ? "" : "s"}`, "success");
    } catch (err: any) {
      toast("Failed to apply changes: " + err.message, "error");
    } finally {
      setIsApplyingAmendment(false);
    }
  }

  const insertNewLineRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMidCost) return toast("Please fill out item title and standard cost", "info");

    flushPendingDebounce();

    const fallbackHighTitle = newHighTitle.trim() || `${newTitle.trim()} Luxury Upgrade`;
    const fallbackHighDescription = newHighDescription.trim() || newMidDescription.trim() || `Premium luxury grade installation upgrade tier parameters for ${newTitle.trim()}.`;
    const fallbackHighCost = newHighCost ? toNum(newHighCost) : toNum(newMidCost) * 1.35;

    const payloadItem = {
      category: newCategory.trim(),
      title: newTitle.trim(),
      mid_description: newMidDescription.trim(),
      mid_cost: toNum(newMidCost),
      high_title: fallbackHighTitle,
      high_description: fallbackHighDescription,
      high_cost: fallbackHighCost || 0
    };

    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    const nextItemsArray = orderItemsByCategory([...currentItems, payloadItem]);

    setNewTitle("");
    setNewMidDescription("");
    setNewMidCost("");
    setNewHighTitle("");
    setNewHighDescription("");
    setNewHighCost("");
    setNewCategory("");

    saveGlobalScopeItemChanges(nextItemsArray);
  };

  const removeLineRowItem = (indexToRemove: number) => {
    if (!confirm("Are you sure you want to delete this contract scope item row?")) return;
    flushPendingDebounce();
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    const nextItemsArray = currentItems.filter((_, idx) => idx !== indexToRemove);
    saveGlobalScopeItemChanges(nextItemsArray);
  };

  const debouncedSave = useCallback((items: any[]) => {
    flushPendingDebounce();
    saveTimerRef.current = setTimeout(() => saveGlobalScopeItemChanges(items), 600);
  }, [projectId]);

  async function saveSelectionOptions(updatedOptions: any[], updatedSelections?: Record<string, string>) {
    const patch: any = { homeowner_options: updatedOptions };
    if (updatedSelections !== undefined) patch.homeowner_selections = updatedSelections;
    setProject((prev: any) => ({ ...prev, ...patch }));
    const { error } = await supabase
      .from("invoices")
      .update(patch)
      .eq("id", projectId);
    if (error) {
      toast("Failed to save selections: " + error.message, "error");
      fetchComprehensiveProjectData();
    }
  }

  function searchLibrary(q: string) {
    setLibraryQuery(q);
    if (libraryTimerRef.current) clearTimeout(libraryTimerRef.current);
    if (!q.trim()) { setLibraryResults([]); return; }
    libraryTimerRef.current = setTimeout(async () => {
      setLibraryLoading(true);
      try {
        const res = await fetch(`/api/search-selections?q=${encodeURIComponent(q.trim())}&exclude=${projectId}`);
        const data = await res.json();
        setLibraryResults(data.results || []);
      } catch {
        setLibraryResults([]);
      } finally {
        setLibraryLoading(false);
      }
    }, 300);
  }

  function addFromLibrary(gIdx: number, item: any) {
    const choiceObj: any = { label: item.label };
    if (item.image_url) choiceObj.image_url = item.image_url;
    if (item.product_url) choiceObj.product_url = item.product_url;
    const updated = [...project.homeowner_options];
    const existing = updated[gIdx].choices.map((c: any) => typeof c === "string" ? c : c.label);
    if (existing.includes(item.label)) {
      toast(`"${item.label}" is already in this category.`, "info");
      return;
    }
    updated[gIdx] = { ...updated[gIdx], choices: [...updated[gIdx].choices, choiceObj] };
    saveSelectionOptions(updated);
    toast(`Added "${item.label}" from ${item.source_project}`, "success");
    setLibrarySearchIdx(null);
    setLibraryQuery("");
    setLibraryResults([]);
  }

  function startScan(gIdx: number) {
    setScanStep({ gIdx, files: [] });
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) setScanStep({ gIdx, files: [f] });
    };
    input.click();
  }

  function addSecondPhoto() {
    if (!scanStep) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (f) setScanStep(prev => prev ? { ...prev, files: [...prev.files, f] } : null);
    };
    input.click();
  }

  async function resizeImage(file: File): Promise<File> {
    if (file.size < 3_000_000) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        let { width, height } = img;
        const maxDim = 2048;
        if (width > height) { if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; } }
        else { if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; } }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob && blob.size < file.size ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        }, "image/jpeg", 0.92);
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file); };
      img.src = objectUrl;
    });
  }

  async function submitScan() {
    if (!scanStep || !scanStep.files.length) return;
    const { gIdx, files } = scanStep;
    setScanningIdx(gIdx);
    setScanStep(null);
    try {
      const category = project.homeowner_options[gIdx]?.category || "";
      const formData = new FormData();
      for (const f of files) {
        const resized = await resizeImage(f);
        formData.append("photos", resized);
      }
      formData.append("invoice_id", projectId);
      formData.append("category", category);

      console.log(`[scan] Sending ${files.length} photo(s), sizes: ${files.map(f => `${(f.size/1024).toFixed(0)}KB`).join(", ")}`);
      const res = await fetch("/api/scan-sample", { method: "POST", body: formData });
      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { throw new Error(text.slice(0, 120)); }
      if (!res.ok) throw new Error(data.error || "Scan failed");

      const aiName = data.product_name || "";
      const aiDesc = [data.manufacturer, data.material_type, data.color_description].filter(Boolean).join(" — ");
      const label = aiName || aiDesc || `Sample ${Date.now().toString().slice(-4)}`;
      const hasImage = !!data.image_url;

      const newChoice: any = { label };
      if (data.image_url) newChoice.image_url = data.image_url;
      if (data.product_url) newChoice.product_url = data.product_url;

      const updated = [...project.homeowner_options];
      updated[gIdx] = { ...updated[gIdx], choices: [...updated[gIdx].choices, newChoice] };
      saveSelectionOptions(updated);

      if (!hasImage) {
        toast(`Added "${label}" (image failed: ${data.storage_error || "bucket may not exist"})`, "info");
      } else {
        toast(`Added "${label}"${aiDesc && aiName ? ` (${aiDesc})` : ""}`, "success");
      }
    } catch (err: any) {
      toast("Scan failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setScanningIdx(null);
    }
  }

  const updateInlineItemField = (index: number, field: string, value: any) => {
    const currentItems = Array.isArray(project.items) ? [...project.items] : [];
    currentItems[index] = {
      ...currentItems[index],
      [field]: value
    };
    const isApproved = project?.status === "approved";
    const newTotal = isApproved
      ? currentItems.reduce((sum: number, item: any) => sum + toNum(item.actual_cost ?? item.cost ?? item.mid_cost), 0)
      : currentItems.reduce((sum: number, item: any) => sum + toNum(item.mid_cost), 0);
    setProject((prev: any) => ({
      ...prev,
      items: currentItems,
      amount: newTotal
    }));
    debouncedSave(currentItems);
  };

  // Convert image upload to base64 format right inside the log stream state
  const handleDailyLogPhotoLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttachedPhotoName(file.name);
    setAttachedPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedPhotoBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const submitDailyOperationsLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyNotes.trim() && !attachedPhotoBase64) return;
    setIsLogging(true);

    let photoUrl: string | null = null;
    if (attachedPhotoFile) {
      const filePath = `daily-logs/${projectId}/${Date.now()}-${attachedPhotoFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from("project-photos")
        .upload(filePath, attachedPhotoFile);
      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("project-photos")
          .getPublicUrl(filePath);
        photoUrl = urlData.publicUrl;
      }
    }

    const newLogEntry = {
      timestamp: new Date().toISOString(),
      notes: dailyNotes.trim(),
      photo: photoUrl,
      author: "Contractor Workspace"
    };

    const currentLogs = Array.isArray(project.daily_logs) ? [...project.daily_logs] : [];
    const updatedLogs = [newLogEntry, ...currentLogs];

    try {
      const { error } = await supabase
        .from("invoices")
        .update({ daily_logs: updatedLogs })
        .eq("id", projectId);

      if (error) throw error;
      setProject((prev: any) => ({ ...prev, daily_logs: updatedLogs }));
      setDailyNotes("");
      setAttachedPhotoBase64("");
      setAttachedPhotoName("");
      setAttachedPhotoFile(null);
      toast("Daily log saved", "success");
    } catch (err: any) {
      toast("Failed to submit field log: " + err.message, "error");
    } finally {
      setIsLogging(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-6 w-6 animate-spin rounded-full border border-rule-300/70 border-t-ink-900" />
        <p className="font-sans text-[13px] tracking-architect text-ink-500">Loading project</p>
      </div>
    </div>
  );

  return (
    <div className="pb-28 text-left">
      
      {/* Navigation Header Banner */}
      <div className="sticky top-0 z-40 border-b border-rule-300/70 bg-paper-100/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">

            <div className="min-w-0">
              <button
                type="button"
                onClick={() => router.push("/admin/projects")}
                className="group inline-flex items-center gap-1.5 font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 ease-architect hover:text-ink-900"
              >
                <svg aria-hidden className="h-3 w-3 transition-transform duration-300 ease-architect group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Project Index
              </button>

              <h1 className="display-md mt-1.5 break-words">
                {project?.homeowner_name || "CLIENT"}
              </h1>

              {project?.proposal_number && (
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-sans text-[10.5px] tracking-architect">
                  <span className="break-all text-bronze-500">{project.proposal_number}</span>
                  {project.estimate_number && (
                    <span className="whitespace-nowrap text-[10px] normal-case tracking-[0.08em] text-ink-500">
                      from {project.estimate_number}
                    </span>
                  )}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className={`badge ${
                project?.status === "approved" ? "badge-approved" :
                project?.status === "declined" ? "badge-declined" :
                "badge-pending"
              }`}>
                <span className={`badge-dot ${
                  project?.status === "approved" ? "bg-forest-500" :
                  project?.status === "declined" ? "bg-brick-500" :
                  "bg-bronze-400"
                }`} />
                {project?.status || "PENDING"}
              </span>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/invoice/${projectId}`);
                  toast("Portal link copied", "success");
                }}
                className="btn-outline px-3 sm:px-4"
                title="Copy the client portal link"
              >
                <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
                Copy Link
              </button>

              <button
                type="button"
                onClick={sendProposalEmail}
                disabled={isSendingEmail}
                className="btn-ink px-3 sm:px-4"
              >
                <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {isSendingEmail ? "Sending..." : "Send Proposal"}
              </button>

              {project?.status !== "approved" && project?.status !== "declined" && (
                <button
                  type="button"
                  onClick={markDeclined}
                  className="btn-outline border-brick-200 px-3 text-brick-700 hover:border-brick-500 hover:bg-brick-50 sm:px-4"
                >
                  Mark Declined
                </button>
              )}

              {project?.status === "declined" && (
                <button
                  type="button"
                  onClick={reopenProposal}
                  className="btn-brass px-3 sm:px-4"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* METRICS ROW CARDS AREA */}
      <div className="mx-auto max-w-6xl px-4 pt-7 sm:px-8 sm:pt-9">
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-panel bg-paper-200/60 shadow-riser ring-1 ring-rule-300/50 lg:grid-cols-3">

        {/* PROJECT ADDRESS CARD */}
        <div className="relative flex flex-col justify-between gap-5 overflow-hidden bg-paper-50 px-6 py-7 transition-colors duration-300 ease-architect hover:bg-paper-100">
          <div>
            <div className="flex items-baseline justify-between gap-3 border-b border-rule-300/55 pb-2.5">
              <p className="eyebrow">Project Address</p>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 ease-architect hover:text-ink-900"
              >
                Edit
              </button>
            </div>
            <h3 className="mt-3 display-sm">{project?.job_address || "No address specified."}</h3>
            {project?.project_title && (
              <p className="mt-1.5 font-sans text-[13px] tracking-architect text-bronze-500">{project.project_title}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <div>
              <p className="eyebrow">Client</p>
              <p className="mt-1 text-[13px] font-medium text-ink-900">{project?.homeowner_name || "N/A"}</p>
            </div>
            <p className="truncate font-sans text-[11px] text-ink-500">{project?.homeowner_email || "N/A"}</p>
            {project?.homeowner_phone && (
              <a href={`tel:${project.homeowner_phone}`} className="block truncate font-sans text-[11px] text-ink-500 transition-colors duration-200 ease-architect hover:text-ink-900">
                {project.homeowner_phone}
              </a>
            )}
          </div>
        </div>

        {/* PROJECT COST METRIC CARD */}
        <div className="flex flex-col justify-between gap-5 bg-paper-50 px-6 py-7 transition-colors duration-300 ease-architect hover:bg-paper-100">
          <div>
            <p className="eyebrow border-b border-rule-300/55 pb-2.5">Project Cost</p>
            {(() => {
              const items = Array.isArray(project?.items) ? project.items : [];
              const hasActuals = project?.status === "approved" && items.some((i: any) => i.actual_cost != null);
              const bidTotal = items.reduce((s: number, i: any) => s + toNum(i.cost || i.mid_cost), 0);
              const actualTotal = items.reduce((s: number, i: any) => s + toNum(i.actual_cost ?? i.cost ?? i.mid_cost), 0);
              if (hasActuals) {
                return (
                  <div className="mt-3 space-y-2.5">
                    <h2 className="figure text-[1.75rem] leading-none sm:text-[2rem]">
                      <span className="text-ink-400">$</span>{actualTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </h2>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 font-sans text-[13px] tracking-architect">
                      <span className="text-ink-500">
                        Bid <span className="tnum text-ink-500">${bidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </span>
                      <span className={`tnum ${actualTotal > bidTotal ? 'text-brick-600' : 'text-forest-600'}`}>
                        {actualTotal > bidTotal ? '▲' : '▼'} ${Math.abs(actualTotal - bidTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                );
              }
              return (
                <h2 className="figure mt-3 text-[1.75rem] leading-none sm:text-[2rem]">
                  <span className="text-ink-400">$</span>{toNum(project?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h2>
              );
            })()}
          </div>
          <button
            type="button"
            onClick={async () => {
              const newVal = !project?.deposit_cleared;
              setProject((prev: any) => ({ ...prev, deposit_cleared: newVal }));
              const { error } = await supabase
                .from("invoices")
                .update({ deposit_cleared: newVal })
                .eq("id", projectId);
              if (error) {
                setProject((prev: any) => ({ ...prev, deposit_cleared: !newVal }));
                toast("Failed to update deposit status: " + error.message, "error");
              }
            }}
            className="flex items-center justify-between gap-3 rounded-edge border border-rule-300/70 bg-paper-100 px-3 py-2.5 transition-colors duration-300 ease-architect hover:border-rule-300 hover:bg-paper-50"
          >
            <span className="eyebrow">Deposit Paid</span>
            <span className={`flex h-4 w-8 rounded-full p-0.5 transition-all duration-300 ease-architect ${project?.deposit_cleared ? 'bg-forest-500 justify-end' : 'bg-paper-200 justify-start'}`}>
              <span className="h-3 w-3 rounded-full bg-paper-50" />
            </span>
          </button>
        </div>

        {/* PORTAL ANALYTICS FEED CARD */}
        <div className="bg-paper-50 px-6 py-7 transition-colors duration-300 ease-architect hover:bg-paper-100">
          <div className="flex items-baseline justify-between gap-3 border-b border-rule-300/55 pb-2.5">
            <p className="eyebrow">Portal Analytics</p>
            <span className="badge badge-neutral">Views<span className="tnum">{project?.view_count || 0}</span></span>
          </div>
          <div className="mt-1 max-h-52 overflow-y-auto scrollbar-none">
            {Array.isArray(project?.view_history) && [...project.view_history].reverse().map((hit: any, i: number) => (
              <div key={i} className="border-b border-rule-300/50 py-2.5 last:border-b-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-sans text-[10px] tabular-nums tracking-architect text-ink-500">#{project.view_history.length - i}</span>
                  <span className="font-sans text-[10px] tabular-nums text-ink-500">
                    {hit.timestamp ? new Date(hit.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : "—"}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {hit.ip && (
                    <span className="rounded-edge border border-rule-300/70 bg-paper-100 px-1.5 py-0.5 font-sans text-[9px] tabular-nums text-ink-500">{hit.ip}</span>
                  )}
                  {hit.device && (
                    <span className={`rounded-edge border px-1.5 py-0.5 font-sans text-[13px] tracking-architect ${
                      hit.device.includes("iOS") ? "border-rule-300/70 bg-paper-50 text-ink-500" :
                      hit.device.includes("Android") ? "border-forest-200 bg-forest-50 text-forest-700" :
                      "border-rule-300/70 bg-paper-100 text-ink-500"
                    }`}>{hit.device}</span>
                  )}
                  {hit.browser && (
                    <span className="rounded-edge border border-bronze-200 bg-bronze-50 px-1.5 py-0.5 font-sans text-[13px] tracking-architect text-bronze-600">{hit.browser}</span>
                  )}
                  {hit.screen && (
                    <span className="rounded-edge border border-rule-300/70 bg-paper-100 px-1.5 py-0.5 font-sans text-[9px] tabular-nums text-ink-500">{hit.screen}</span>
                  )}
                </div>
                {hit.referrer && (
                  <p className="mt-1 truncate font-sans text-[9px] text-ink-400">via {hit.referrer}</p>
                )}
              </div>
            ))}
            {(!project?.view_history || project.view_history.length === 0) && (
              <p className="py-8 text-center font-sans text-[13px] tracking-architect text-ink-400">No portal views yet</p>
            )}
          </div>
        </div>

        </div>
      </div>

      {/* PROJECT DETAILS — start date & timeline */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">01</span>
            <h2 className="display-sm">Programme</h2>
          </div>
          <span className="eyebrow hidden sm:block">Dates</span>
        </div>
        <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <div>
            <label htmlFor="project-start-date" className="field-label">Estimated Start Date</label>
            <input
              id="project-start-date"
              type="date"
              value={project?.estimated_start_date || ""}
              onChange={(e) => {
                setProject((prev: any) => ({ ...prev, estimated_start_date: e.target.value || null }));
              }}
              onBlur={async () => {
                const { error } = await supabase
                  .from("invoices")
                  .update({ estimated_start_date: project?.estimated_start_date || null })
                  .eq("id", projectId);
                if (error) toast("Failed to save start date: " + error.message, "error");
              }}
              className="field tnum"
            />
          </div>
          <div>
            <label htmlFor="project-timeline" className="field-label">Project Timeline</label>
            <input
              id="project-timeline"
              type="text"
              placeholder="e.g. 8–10 Weeks"
              value={project?.project_length || ""}
              onChange={(e) => {
                setProject((prev: any) => ({ ...prev, project_length: e.target.value }));
              }}
              onBlur={async () => {
                const { error } = await supabase
                  .from("invoices")
                  .update({ project_length: project?.project_length || null })
                  .eq("id", projectId);
                if (error) toast("Failed to save timeline: " + error.message, "error");
              }}
              className="field"
            />
          </div>
        </div>
      </section>

      {/* CLIENT ANNOUNCEMENT / PRIORITY BANNER */}
      {project?.status === "approved" && (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
          <div className="title-block">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">02</span>
              <h2 className="display-sm">Client Announcement</h2>
            </div>
            {project?.announcement && (
              <button
                type="button"
                onClick={async () => {
                  setProject((prev: any) => ({ ...prev, announcement: null }));
                  const { error } = await supabase
                    .from("invoices")
                    .update({ announcement: null })
                    .eq("id", projectId);
                  if (error) toast("Failed to clear: " + error.message, "error");
                  else toast("Announcement cleared", "success");
                }}
                className="shrink-0 font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 ease-architect hover:text-brick-600"
              >
                Clear
              </button>
            )}
          </div>

          <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
            This message runs as a priority banner at the top of the homeowner portal. Leave it blank to show the default status line.
          </p>

          <label htmlFor="client-announcement" className="sr-only">Client announcement</label>
          <textarea
            id="client-announcement"
            value={project?.announcement || ""}
            onChange={(e) => {
              setProject((prev: any) => ({ ...prev, announcement: e.target.value }));
            }}
            onBlur={async () => {
              const val = project?.announcement?.trim() || null;
              const { error } = await supabase
                .from("invoices")
                .update({ announcement: val })
                .eq("id", projectId);
              if (error) toast("Failed to save announcement: " + error.message, "error");
              else if (val) toast("Announcement published", "success");
            }}
            placeholder="e.g. Tile selections are due by Friday — please visit the Selections tab and make your choices so we can stay on schedule."
            className="field mt-3.5 min-h-[64px] resize-y leading-relaxed"
            rows={2}
          />

          {project?.announcement && (
            <div className="mt-3 flex items-start gap-3 border-l-2 border-bronze-400 bg-bronze-50/60 px-5 py-4">
              <svg aria-hidden className="mt-px h-3.5 w-3.5 shrink-0 text-bronze-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253 1.077.583 2.123.983 3.13.457 1.15.83 1.62 1.677 1.62.848 0 1.535-.687 1.535-1.535 0-.264-.067-.523-.194-.755a19.5 19.5 0 01-1.03-2.16m-2.97-.3a48.4 48.4 0 013.66.66m-3.66-9.54a48.4 48.4 0 003.66-.66m0 10.2a24.3 24.3 0 000-9.54m0 9.54a3.75 3.75 0 000-9.54" />
              </svg>
              <p className="text-[12px] leading-relaxed text-ink-500">
                <span className="eyebrow-ink mr-2">Live on portal</span>
                {project.announcement}
              </p>
            </div>
          )}
        </section>
      )}

      {/* PROPOSAL EXPIRATION TIMER — only pre-approval */}
      {project?.status !== "approved" && (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
          <div className="title-block">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">02</span>
              <h2 className="display-sm">Proposal Expiration</h2>
            </div>
            <span className="eyebrow hidden sm:block">Hold</span>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-md text-[12.5px] leading-relaxed text-ink-500">
              Set a deadline to hold pricing and a schedule slot. A live countdown appears on the client portal.
            </p>
            <div className="flex items-end gap-2">
              <div className="min-w-0">
                <label htmlFor="proposal-expires-at" className="field-label">Expires</label>
                <input
                  id="proposal-expires-at"
                  type="datetime-local"
                  value={project?.proposal_expires_at ? new Date(new Date(project.proposal_expires_at).getTime() - new Date(project.proposal_expires_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""}
                  onChange={(e) => {
                    const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                    setProject((prev: any) => ({ ...prev, proposal_expires_at: val }));
                  }}
                  onBlur={async () => {
                    const { error } = await supabase
                      .from("invoices")
                      .update({ proposal_expires_at: project?.proposal_expires_at || null })
                      .eq("id", projectId);
                    if (error) toast("Failed to save expiration: " + error.message, "error");
                    else toast("Expiration updated", "success");
                  }}
                  className="field tnum w-full sm:w-auto"
                />
              </div>
              {project?.proposal_expires_at && (
                <button
                  type="button"
                  onClick={async () => {
                    setProject((prev: any) => ({ ...prev, proposal_expires_at: null }));
                    const { error } = await supabase
                      .from("invoices")
                      .update({ proposal_expires_at: null })
                      .eq("id", projectId);
                    if (error) toast("Failed to clear expiration: " + error.message, "error");
                    else toast("Expiration removed", "success");
                  }}
                  className="mb-[1px] flex h-[38px] w-9 shrink-0 items-center justify-center rounded-edge border border-rule-300 text-ink-500 transition-colors duration-200 ease-architect hover:border-brick-300 hover:bg-brick-50 hover:text-brick-600"
                  title="Clear expiration"
                >
                  <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {project?.proposal_expires_at && (
            <div className="mt-4 flex items-center gap-2.5 border-t border-rule-300/55 pt-3.5">
              {new Date(project.proposal_expires_at) > new Date() ? (
                <>
                  <span className="badge-dot animate-pulse bg-bronze-400" />
                  <p className="text-[12px] text-ink-500">
                    Expires <span className="tnum">{new Date(project.proposal_expires_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    {' · '}
                    <span className="font-sans text-[13px] tracking-architect text-bronze-600">
                      {(() => {
                        const diff = new Date(project.proposal_expires_at).getTime() - Date.now();
                        const days = Math.floor(diff / 86400000);
                        const hours = Math.floor((diff % 86400000) / 3600000);
                        if (days > 0) return `${days}d ${hours}h remaining`;
                        const mins = Math.floor((diff % 3600000) / 60000);
                        return `${hours}h ${mins}m remaining`;
                      })()}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <span className="badge-dot bg-brick-500" />
                  <p className="text-[12px] text-brick-700">Proposal expired — the client can no longer accept</p>
                </>
              )}
            </div>
          )}

          {Array.isArray(project?.proposal_emails) && project.proposal_emails.length > 0 && (
            <div className="mt-4 border-t border-rule-300/55 pt-3.5">
              <p className="eyebrow mb-2">Email History</p>
              <div className="flex flex-wrap gap-1.5">
                {project.proposal_emails.map((log: any, i: number) => (
                  <span key={i} className={`badge ${
                    log.type === 'reminder' ? 'badge-pending' : 'badge-neutral'
                  }`}>
                    {log.type === 'reminder' ? `Reminder (${log.tier})` : 'Proposal sent'} · {new Date(log.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* GANTT BLUEPRINT SCHEDULER HORIZON TRACK */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">03</span>
            <h2 className="display-sm">Schedule Horizon</h2>
          </div>
          <span className="eyebrow hidden sm:block">Production Phases</span>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Nest trade rows and track phase progress against the production calendar.
        </p>

        <div className="panel blueprint-grid mt-4 overflow-hidden">
          <div className="flex items-baseline justify-between gap-4 border-b border-rule-300/55 bg-paper-50/60 px-5 py-3 sm:px-5">
            <span className="eyebrow">Phase Track</span>
            <span className="eyebrow hidden sm:block">Calendar Grid</span>
          </div>

          <div className="px-6 py-14 text-center">
            <p className="display-sm">Horizon track not configured</p>
            <p className="mx-auto mt-2 max-w-sm text-[12.5px] leading-relaxed text-ink-500">
              Phase rows appear here once the production calendar is built out for this project.
            </p>
          </div>
        </div>
      </section>

      {/* PAYMENT SCHEDULE & DEPOSIT MANAGER */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">04</span>
            <h2 className="display-sm">Schedule of Values</h2>
          </div>
          <span className="eyebrow hidden sm:block">Deposit &amp; Draws</span>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Configure the deposit and the payment draw phases. Changes sync instantly to the homeowner portal.
        </p>

        {/* Deposit Amount & Percentage — the percentage is what's stored; the
            dollar figure is always derived from the current project total. */}
        <div className="mt-5">
          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-[minmax(0,1fr)_120px]">
            <div>
              <label htmlFor="deposit-amount" className="field-label">Deposit Amount</label>
              <div className="flex items-center gap-1.5 rounded-edge border border-rule-300 bg-paper-50 px-3.5 transition-all duration-200 ease-architect focus-within:border-rule-400 focus-within:ring-[3px] focus-within:ring-bronze-300/20">
                <span className="font-sans text-[11px] text-ink-400">$</span>
                <input
                  id="deposit-amount"
                  type="number"
                  min="0"
                  value={depositAmountOf(project, project?.amount)}
                  onChange={(e) =>
                    setProject((prev: any) => ({
                      ...prev,
                      ...depositFieldsFor(amountToPercent(e.target.value, prev?.amount), prev?.amount),
                    }))
                  }
                  onBlur={saveDeposit}
                  className="no-spin tnum w-full min-w-0 bg-transparent py-2.5 text-[13px] font-medium text-ink-900 outline-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="deposit-percent" className="field-label">Deposit %</label>
              <div className="flex items-center gap-1.5 rounded-edge border border-rule-300 bg-paper-50 px-3.5 transition-all duration-200 ease-architect focus-within:border-rule-400 focus-within:ring-[3px] focus-within:ring-bronze-300/20">
                <input
                  id="deposit-percent"
                  type="number"
                  min="0"
                  max="100"
                  value={displayPercent(depositPercentOf(project, project?.amount))}
                  onChange={(e) =>
                    setProject((prev: any) => ({
                      ...prev,
                      ...depositFieldsFor(e.target.value, prev?.amount),
                    }))
                  }
                  onBlur={saveDeposit}
                  className="no-spin tnum w-full min-w-0 bg-transparent py-2.5 text-[13px] font-medium text-ink-900 outline-none"
                />
                <span className="font-sans text-[11px] text-ink-400">%</span>
              </div>
            </div>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-500">
            Edit either amount or percentage — the other updates automatically. The deposit is stored as a
            percentage, so it follows the project total if the scope changes.
          </p>
        </div>

        {/* Phase Rows */}
        <div className="mt-7">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule-300/70 pb-2.5">
            <p className="eyebrow">Draw Phases</p>
            <p className="font-sans text-[13px] tracking-architect text-ink-500">
              Total <span className={`tnum ${
                totalScheduledPercent(project?.payment_phases, project?.amount) === 100
                  ? "text-forest-600" : "text-brick-600"
              }`}>
                {displayPercent(totalScheduledPercent(project?.payment_phases, project?.amount))}%
              </span>
              <span className="tnum text-ink-400">
                {" "}· ${totalScheduledAmount(project?.payment_phases, project?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} of $
                {toNum(project?.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </p>
          </div>

          {Array.isArray(project?.payment_phases) && project.payment_phases.map((phase: any, idx: number) => {
            const phaseAmount = phaseAmountOf(phase, project?.amount);
            const phasePercent = phasePercentOf(phase, project?.amount);
            const isApprovedProject = project?.status === "approved";
            const activePhaseIdx = project?.current_phase_index || 0;
            const isPhasePaid = isApprovedProject && project?.deposit_cleared && (idx === 0 || idx < activePhaseIdx);
            const isPhaseActive = isApprovedProject && (idx === activePhaseIdx || (idx === 0 && !project?.deposit_cleared));
            const canRemind = isApprovedProject && isPhaseActive && !isPhasePaid;

            const updatePhase = (updates: any) => {
              const updated = [...project.payment_phases];
              updated[idx] = { ...updated[idx], ...updates };
              setProject((prev: any) => ({ ...prev, payment_phases: updated }));
            };

            const savePhase = () => savePhases(project.payment_phases);

            return (
              <div key={idx} className="group relative border-b border-rule-300/55 py-3.5 transition-colors duration-300 ease-architect hover:bg-paper-50">
                <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-bronze-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />

                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:pl-3">
                  <div className="flex w-full items-center gap-2.5 sm:w-auto sm:min-w-0 sm:flex-1">
                    <span className="shrink-0 font-sans text-[10px] tabular-nums tracking-architect text-ink-400">
                      #{idx + 1}
                    </span>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase({ name: e.target.value })}
                      onBlur={savePhase}
                      title="Draw phase name"
                      className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent py-1 text-[13px] font-medium text-ink-900 outline-none transition-colors duration-200 ease-architect hover:border-rule-300/70 focus:border-rule-400"
                    />
                  </div>

                  {/* Amount Input — takes the free space on its own mobile row */}
                  <div className="flex flex-1 items-center gap-1 rounded-edge border border-rule-300/70 bg-paper-50 px-2 transition-colors duration-200 ease-architect focus-within:border-rule-400 sm:w-[124px] sm:flex-none">
                    <span className="font-sans text-[10px] text-ink-400">$</span>
                    <input
                      type="number"
                      min="0"
                      value={phaseAmount}
                      onChange={(e) => {
                        const percentage = amountToPercent(e.target.value, project?.amount);
                        updatePhase({ percentage, amount: roundCents(e.target.value) });
                      }}
                      onBlur={savePhase}
                      title="Draw amount"
                      className="no-spin tnum w-full min-w-0 bg-transparent py-1.5 text-right text-[12.5px] font-medium text-ink-900 outline-none"
                    />
                  </div>

                  {/* Percentage Display */}
                  <div className="flex shrink-0 items-center gap-1 rounded-edge border border-rule-300/70 bg-paper-50 px-2 transition-colors duration-200 ease-architect focus-within:border-rule-400">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={displayPercent(phasePercent)}
                      onChange={(e) => {
                        const percent = Math.min(100, Math.max(0, toNum(e.target.value)));
                        updatePhase({ percentage: percent, amount: phaseAmountOf({ percentage: percent }, project?.amount) });
                      }}
                      onBlur={savePhase}
                      title="Draw percentage"
                      className="no-spin tnum w-11 bg-transparent py-1.5 text-center text-[12.5px] font-medium text-ink-900 outline-none"
                    />
                    <span className="font-sans text-[10px] text-ink-400">%</span>
                  </div>

                  {isApprovedProject && isPhasePaid && (
                    <span className="badge badge-approved shrink-0"><span className="badge-dot bg-forest-500" />Paid</span>
                  )}
                  {isApprovedProject && isPhaseActive && !isPhasePaid && (
                    <span className="badge badge-pending shrink-0"><span className="badge-dot bg-bronze-400" />Due</span>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (project.payment_phases.length <= 1) return toast("Must have at least one phase.", "info");
                      if (!confirm(`Remove "${phase.name}"?`)) return;
                      await savePhases(project.payment_phases.filter((_: any, i: number) => i !== idx));
                    }}
                    title="Remove draw phase"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-edge text-ink-400 transition-all duration-200 ease-architect hover:bg-brick-50 hover:text-brick-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {canRemind && idx === 0 && !project?.deposit_cleared && (
                  <button
                    type="button"
                    disabled={sendingReminderIdx === 0}
                    onClick={async () => {
                      if (!project?.homeowner_email) return toast("No email on file.", "error");
                      setSendingReminderIdx(0);
                      try {
                        const res = await fetch("/api/send-deposit-email", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ invoice_id: projectId, base_url: window.location.origin, preview_only: true }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed");
                        setDepositPreviewHtml(data.html);
                      } catch (err: any) {
                        toast("Preview failed: " + err.message, "error");
                      } finally {
                        setSendingReminderIdx(null);
                      }
                    }}
                    className="btn-outline mt-2.5 w-full py-2 text-[13px] tracking-architect sm:ml-3 sm:w-auto"
                  >
                    <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {sendingReminderIdx === 0 ? "Loading..." : "Send Deposit Email"}
                  </button>
                )}
                {canRemind && (idx > 0 || project?.deposit_cleared) && (
                  <button
                    type="button"
                    disabled={sendingReminderIdx === idx}
                    onClick={async () => {
                      if (!project?.homeowner_email) return toast("No email on file.", "error");
                      setSendingReminderIdx(idx);
                      try {
                        const totalPaid = (project.payment_history || []).reduce((s: number, p: any) => s + toNum(p.amount), 0);
                        const totalRemaining = toNum(project.amount) - totalPaid;
                        const res = await fetch("/api/send-payment-reminder", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            invoice_id: projectId,
                            phase_name: phase.name,
                            phase_amount: phaseAmount,
                            total_remaining: totalRemaining,
                            base_url: window.location.origin,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error || "Failed");
                        toast(`Reminder sent to ${data.sent_to}`, "success");
                      } catch (err: any) {
                        toast("Reminder failed: " + err.message, "error");
                      } finally {
                        setSendingReminderIdx(null);
                      }
                    }}
                    className="btn-outline mt-2.5 w-full border-bronze-200 py-2 text-[13px] tracking-architect text-bronze-600 hover:border-bronze-400 hover:bg-bronze-50 sm:ml-3 sm:w-auto"
                  >
                    <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {sendingReminderIdx === idx ? "Sending..." : "Send Payment Reminder"}
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Phase Button */}
          <button
            type="button"
            onClick={async () => {
              const currentPhases = Array.isArray(project?.payment_phases) ? [...project.payment_phases] : [];
              const remaining = Math.max(0, 100 - totalScheduledPercent(currentPhases, project?.amount));
              await savePhases([...currentPhases, { name: "New Phase", percentage: remaining }]);
            }}
            className="mt-4 w-full rounded-edge border border-dashed border-rule-300 py-2.5 font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 ease-architect hover:border-rule-400 hover:text-ink-900"
          >
            Add Draw Phase
          </button>
        </div>
      </section>

      {/* ITEMS MANAGER LEDGER CARD CONTAINER */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">05</span>
            <h2 className="display-sm">Line Items</h2>
          </div>
          <button
            type="button"
            onClick={async () => {
              const newVal = !project?.show_luxury_tier;
              setProject((prev: any) => ({ ...prev, show_luxury_tier: newVal }));
              const { error } = await supabase
                .from("invoices")
                .update({ show_luxury_tier: newVal })
                .eq("id", projectId);
              if (error) {
                setProject((prev: any) => ({ ...prev, show_luxury_tier: !newVal }));
                toast("Failed to update luxury tier visibility: " + error.message, "error");
              }
            }}
            className="flex shrink-0 items-center gap-2.5 rounded-edge border border-rule-300 bg-paper-50 px-2.5 py-1.5 transition-colors duration-300 ease-architect hover:border-rule-400/70 hover:bg-paper-100"
            title="Show or hide the high tier on the client portal"
          >
            <span className="eyebrow">High Tier</span>
            <span className={`flex h-4 w-8 rounded-full p-0.5 transition-all duration-300 ease-architect ${project?.show_luxury_tier ? 'bg-paper-50 justify-end' : 'bg-paper-200 justify-start'}`}>
              <span className="h-3 w-3 rounded-full bg-paper-50" />
            </span>
          </button>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Amend descriptions and values, or append new scope directly into the contract ledger.
        </p>

        {/* AI SCOPE AMENDMENT — pre-approval only; after approval added scope
            belongs in a change order the homeowner signs separately. */}
        {project?.status !== "approved" && (
          <div className="panel-sunken mt-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow-ink">Add Scope with AI</p>
                <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-ink-500">
                  List what you want to add. The estimator checks it against the scope already in this proposal,
                  folds work into the line it belongs to, prices what&apos;s genuinely new, and files everything by category.
                  Nothing changes until you approve it below.
                </p>
              </div>
            </div>

            <label htmlFor="scope-amendment" className="sr-only">Scope additions</label>
            <textarea
              id="scope-amendment"
              value={amendRequest}
              onChange={(e) => setAmendRequest(e.target.value)}
              rows={3}
              placeholder="e.g. add 6 can lights in the living room, upgrade the island counter to quartz, add a wet bar sink with supply and drain, tile the mudroom floor"
              className="field mt-4 resize-y leading-relaxed"
            />

            <div className="mt-3.5 flex justify-end">
              <button
                type="button"
                onClick={analyzeScopeAmendment}
                disabled={isAnalyzingAmendment || !amendRequest.trim()}
                className="btn-ink"
              >
                {isAnalyzingAmendment ? "Analyzing scope..." : "Analyze Additions"}
              </button>
            </div>

            {/* Proposed changes — reviewed line by line before anything is saved */}
            {amendment && (
              <div className="mt-5 animate-rise">
                {amendment.summary && (
                  <div className="panel p-4">
                    <p className="eyebrow">Estimator Summary</p>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{amendment.summary}</p>
                  </div>
                )}

                <div className="mt-3 border-t border-rule-300/70">
                  {amendment.previews.map((preview: ScopeOperationPreview, idx: number) => {
                    const rejected = rejectedOps.includes(idx);
                    const op = preview.operation;
                    const isMerge = op.action === "merge";
                    const isRecat = op.action === "recategorize";
                    const badge = isMerge
                      ? `Merged into line #${(op.target_index ?? 0) + 1}`
                      : isRecat
                      ? `Recategorized line #${(op.target_index ?? 0) + 1}`
                      : "New line item";

                    return (
                      <div
                        key={idx}
                        className={`border-b border-rule-300/55 px-1 py-4 transition-all duration-300 ease-architect ${
                          rejected ? "opacity-40" : "bg-paper-50/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() => toggleAmendmentOp(idx)}
                            title={rejected ? "Include this change" : "Skip this change"}
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-edge border transition-all duration-200 ease-architect ${
                              rejected
                                ? "border-rule-300 bg-paper-50 text-transparent hover:border-rule-400"
                                : "border-rule-300 bg-paper-50 text-ink-900"
                            }`}
                          >
                            <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          </button>

                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className={`badge ${
                                isMerge
                                  ? "badge-pending"
                                  : isRecat
                                  ? "badge-neutral"
                                  : "badge-approved"
                              }`}>
                                {badge}
                              </span>
                              <span className="badge badge-ink">
                                {op.category}
                              </span>
                            </div>

                            <p className="text-[13px] font-medium leading-snug tracking-[-0.01em] text-ink-900">{preview.after.title}</p>

                            {op.addition && (
                              <p className="text-[11.5px] text-ink-500">
                                Covers <span className="italic">&ldquo;{op.addition}&rdquo;</span>
                              </p>
                            )}
                            {op.reason && (
                              <p className="text-[11.5px] leading-relaxed text-ink-500">{op.reason}</p>
                            )}

                            {/* Before → after, computed from the saved proposal */}
                            {preview.before && !isRecat && (
                              <div className="space-y-2 border-l border-rule-300/70 pl-3">
                                <div>
                                  <p className="eyebrow">Was</p>
                                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
                                    {preview.before.title} — ${midCostOf(preview.before).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </p>
                                </div>
                                <div>
                                  <p className="eyebrow">Becomes</p>
                                  <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-500">
                                    {preview.after.mid_description}
                                  </p>
                                </div>
                              </div>
                            )}
                            {!preview.before && preview.after.mid_description && (
                              <p className="border-l border-rule-300/70 pl-3 text-[11.5px] leading-relaxed text-ink-500">
                                {preview.after.mid_description}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="figure text-[13px]">
                              ${toNum(preview.after.mid_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                            {toNum(preview.mid_delta) !== 0 && (
                              <p className={`mt-0.5 font-sans text-[10px] tabular-nums ${toNum(preview.mid_delta) > 0 ? "text-forest-600" : "text-brick-600"}`}>
                                {toNum(preview.mid_delta) > 0 ? "+" : "−"}${Math.abs(toNum(preview.mid_delta)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Apply bar */}
                <div className="mt-4 flex flex-col justify-between gap-3 border-t border-rule-300 pt-4 sm:flex-row sm:items-end">
                  <div>
                    <p className="eyebrow">
                      {acceptedPreviews.length} of {amendment.previews.length} change{amendment.previews.length === 1 ? "" : "s"} selected
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-ink-900">
                      Proposal total {acceptedMidDelta >= 0 ? "increases" : "decreases"} by <span className="tnum font-medium">$
                      {Math.abs(acceptedMidDelta).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="tnum text-ink-500">
                        {" "}→ ${(toNum(project?.amount) + acceptedMidDelta).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={discardAmendment}
                      disabled={isApplyingAmendment}
                      className="btn-outline"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={applyAcceptedAmendment}
                      disabled={isApplyingAmendment || acceptedPreviews.length === 0}
                      className="btn-ink"
                    >
                      {isApplyingAmendment ? "Applying..." : `Apply ${acceptedPreviews.length} Change${acceptedPreviews.length === 1 ? "" : "s"}`}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DUAL-TIER WORKSPACE INPUT ROW LOOPS */}
        <div className="mt-7">
          {groupItemsByCategory(project?.items).map((group) => (
            <div key={group.category} className="mb-8 last:mb-0">

              {/* Category band — the AI files lines under these, and the
                  stored order follows them so the portal and PDF match. */}
              <div className="flex items-baseline gap-3 border-b border-rule-300 pb-2">
                <span className="shrink-0 font-sans text-[13px] tracking-architect text-ink-900">{group.category}</span>
                <span className="shrink-0 font-sans text-[13px] tracking-architect text-ink-400">
                  {group.entries.length} line{group.entries.length === 1 ? "" : "s"}
                </span>
                <span aria-hidden className="h-px flex-1 self-center bg-paper-200/70" />
                <span className="figure shrink-0 text-[12.5px]">
                  ${group.entries.reduce((sum, e) => sum + midCostOf(e.item), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div>
              {group.entries.map(({ item, index: idx }: { item: any; index: number }) => (
            <div key={idx} className="group relative border-b border-rule-300/55 py-5 transition-colors duration-300 ease-architect hover:bg-paper-50">
              <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-bronze-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />

              <div className="sm:pl-4">
                <button
                  type="button"
                  onClick={() => removeLineRowItem(idx)}
                  title="Remove line item"
                  className="absolute right-0 top-4 z-10 flex h-7 w-7 items-center justify-center rounded-edge text-ink-400 transition-all duration-200 ease-architect hover:bg-brick-50 hover:text-brick-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Primary Row Header Component */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pr-9">
                  <span className="shrink-0 font-sans text-[10px] tabular-nums tracking-architect text-ink-400">LINE {idx + 1}</span>
                  <input
                    type="text"
                    value={item.title || ""}
                    onChange={(e) => updateInlineItemField(idx, "title", e.target.value)}
                    placeholder="Line item title"
                    title="Line item title"
                    className="w-full min-w-0 border-0 border-b border-transparent bg-transparent py-1 font-display text-[1.0625rem] leading-snug tracking-[-0.01em] text-ink-900 outline-none transition-colors duration-200 ease-architect placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-400 hover:border-rule-300/70 focus:border-rule-400 sm:w-auto sm:min-w-[12rem] sm:flex-1"
                  />
                  {/* Uncontrolled and committed on blur: editing the category
                      regroups the ledger, which would remount a controlled
                      input and drop focus after the first keystroke. */}
                  <input
                    type="text"
                    key={`category-${idx}-${item.category || ""}`}
                    defaultValue={item.category || ""}
                    onBlur={(e) => {
                      const next = e.target.value.trim();
                      if (next !== (item.category || "").trim()) updateInlineItemField(idx, "category", next);
                    }}
                    placeholder="Category"
                    title="Groups this line in the proposal, the client portal, and the PDF"
                    className="w-full min-w-0 rounded-edge border border-rule-300/70 bg-paper-100 px-2.5 py-1.5 font-sans text-[13px] tracking-architect text-ink-500 outline-none transition-all duration-200 ease-architect focus:border-rule-400 focus:bg-paper-50 sm:w-40"
                  />
                </div>

                {/* Cost+ Bid vs Actual (post-approval) */}
                {project?.status === "approved" && (
                  <div className="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-panel bg-paper-200/60 shadow-riser ring-1 ring-rule-300/50 sm:grid-cols-2">
                    <div className="bg-paper-50 px-5 py-4">
                      <p className="eyebrow">Bid Amount</p>
                      <p className="figure mt-1.5 text-[15px]">
                        ${toNum(item.cost || item.mid_cost).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className={`px-5 py-4 ${item.actual_cost != null ? 'bg-forest-50' : 'bg-bronze-50'}`}>
                      <p className={`eyebrow ${item.actual_cost != null ? 'text-forest-700' : 'text-bronze-600'}`}>
                        Actual Cost
                      </p>
                      <div className="mt-1.5 flex items-baseline gap-1">
                        <span className="font-sans text-[12px] text-ink-500">$</span>
                        <input
                          type="number"
                          value={item.actual_cost ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? null : toNum(e.target.value);
                            updateInlineItemField(idx, "actual_cost", val);
                          }}
                          placeholder="Enter actual"
                          title="Actual cost"
                          className="figure no-spin w-full bg-transparent text-[15px] outline-none placeholder:font-sans placeholder:text-[12px] placeholder:font-normal placeholder:text-ink-400"
                        />
                      </div>
                      {item.actual_cost != null && (
                        <p className={`mt-1 font-sans text-[10px] tabular-nums ${toNum(item.actual_cost) > toNum(item.cost || item.mid_cost) ? 'text-brick-600' : 'text-forest-700'}`}>
                          {toNum(item.actual_cost) > toNum(item.cost || item.mid_cost) ? '▲' : '▼'} ${Math.abs(toNum(item.actual_cost) - toNum(item.cost || item.mid_cost)).toLocaleString(undefined, {minimumFractionDigits:2})} ({toNum(item.cost || item.mid_cost) > 0 ? ((toNum(item.actual_cost) - toNum(item.cost || item.mid_cost)) / toNum(item.cost || item.mid_cost) * 100).toFixed(1) : '0'}%)
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Dual Column Layout Matrix Split Tier (pre-approval editing) */}
                {project?.status !== "approved" && (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  {/* Standard Mid Tier Configuration Box */}
                  <div className="border-t border-rule-300/70 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="eyebrow">Standard Tier</span>
                      <div className="flex max-w-[128px] items-center gap-1 rounded-edge border border-rule-300/70 bg-paper-50 px-2 transition-colors duration-200 ease-architect focus-within:border-rule-400">
                        <span className="font-sans text-[10px] text-ink-400">$</span>
                        <input
                          type="number"
                          value={item.mid_cost || ""}
                          onChange={(e) => updateInlineItemField(idx, "mid_cost", toNum(e.target.value))}
                          title="Standard tier cost"
                          className="no-spin tnum w-full bg-transparent py-1.5 text-right text-[12.5px] font-medium text-ink-900 outline-none"
                        />
                      </div>
                    </div>
                    <textarea
                      value={item.mid_description || item.description || ""}
                      onChange={(e) => updateInlineItemField(idx, "mid_description", e.target.value)}
                      placeholder="Standard grade specification and materials..."
                      title="Standard tier specification"
                      className="field-sunken mt-2 resize-y text-[12px] leading-relaxed"
                      rows={2}
                    />
                  </div>

                  {/* Luxury High Tier Configuration Box */}
                  <div className="border-t border-bronze-300 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="eyebrow text-bronze-600">High Tier Upgrade</span>
                      <div className="flex max-w-[128px] items-center gap-1 rounded-edge border border-bronze-200 bg-paper-50 px-2 transition-colors duration-200 ease-architect focus-within:border-bronze-500">
                        <span className="font-sans text-[10px] text-bronze-400">$</span>
                        <input
                          type="number"
                          value={item.high_cost || ""}
                          onChange={(e) => updateInlineItemField(idx, "high_cost", toNum(e.target.value))}
                          title="High tier cost"
                          className="no-spin tnum w-full bg-transparent py-1.5 text-right text-[12.5px] font-medium text-ink-900 outline-none"
                        />
                      </div>
                    </div>
                    <textarea
                      value={item.high_description || ""}
                      onChange={(e) => updateInlineItemField(idx, "high_description", e.target.value)}
                      placeholder="High tier premium specification and upgrade options..."
                      title="High tier specification"
                      className="mt-2 w-full resize-y rounded-edge border border-bronze-200 bg-bronze-50/40 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-900 outline-none transition-all duration-200 ease-architect placeholder:text-ink-400 focus:border-bronze-500 focus:bg-paper-50 focus:ring-[3px] focus:ring-bronze-500/10"
                      rows={2}
                    />
                  </div>
                </div>
                )}
              </div>

            </div>
              ))}
              </div>
            </div>
          ))}
        </div>

        {/* DUAL LAYER INTEGRATED ENTRY ROW INJECTOR COMPONENT FORM */}
        <form onSubmit={insertNewLineRow} className="panel-sunken mt-7 p-5 sm:p-7">
          <p className="eyebrow-ink">Add Contract Line Item</p>
          <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-ink-500">
            Append a further line with both tier options into the contract ledger.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-4">
            <div className="sm:col-span-3">
              <label htmlFor="new-item-title" className="field-label">Line Title</label>
              <input
                id="new-item-title"
                type="text"
                placeholder="e.g. Backsplash Tile Install"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="new-item-cost" className="field-label">Standard $</label>
              <input
                id="new-item-cost"
                type="number"
                placeholder="0.00"
                value={newMidCost}
                onChange={(e) => setNewMidCost(e.target.value)}
                className="field no-spin tnum text-right"
              />
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="new-item-category" className="field-label">Category</label>
              <input
                id="new-item-category"
                type="text"
                placeholder="e.g. Electrical — groups this line in the proposal, portal, and PDF"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="field"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-4 md:grid-cols-2">
            <div>
              <label htmlFor="new-item-mid-desc" className="field-label">Standard Tier Description</label>
              <input
                id="new-item-mid-desc"
                type="text"
                placeholder="Standard grade materials and specification..."
                value={newMidDescription}
                onChange={(e) => setNewMidDescription(e.target.value)}
                className="field"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <label htmlFor="new-item-high-desc" className="field-label text-bronze-600">High Tier Description</label>
                <span className="mb-1.5 font-sans text-[13px] tracking-architect text-ink-400">Blank auto-prices at +35%</span>
              </div>
              <div className="flex gap-2">
                <input
                  id="new-item-high-desc"
                  type="text"
                  placeholder="Premium upgrade options..."
                  value={newHighDescription}
                  onChange={(e) => setNewHighDescription(e.target.value)}
                  className="field min-w-0 flex-1"
                />
                <input
                  type="number"
                  placeholder="$"
                  title="High tier cost"
                  value={newHighCost}
                  onChange={(e) => setNewHighCost(e.target.value)}
                  className="field no-spin tnum w-24 shrink-0 text-right"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="btn-ink"
            >
              Add Line Item
            </button>
          </div>
        </form>

      </section>

      {/* HOMEOWNER SELECTIONS MANAGER */}
      {project && (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
          <div className="title-block">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">06</span>
              <h2 className="display-sm">Selections</h2>
            </div>
            <button
              type="button"
              onClick={async () => {
                const newVal = !project.selections_visible;
                setProject((prev: any) => ({ ...prev, selections_visible: newVal }));
                const { error } = await supabase.from("invoices").update({ selections_visible: newVal }).eq("id", projectId);
                if (error) {
                  toast("Failed to update visibility: " + error.message, "error");
                  setProject((prev: any) => ({ ...prev, selections_visible: !newVal }));
                } else {
                  toast(newVal ? "Selections tab is now visible to homeowner" : "Selections tab hidden from homeowner", "success");
                }
              }}
              className={`flex shrink-0 items-center gap-2.5 rounded-edge border px-2.5 py-1.5 font-sans text-[13px] tracking-architect transition-colors duration-300 ease-architect ${
                project.selections_visible
                  ? 'border-forest-200 bg-forest-50 text-forest-700 hover:border-forest-500'
                  : 'border-rule-300 bg-paper-50 text-ink-500 hover:border-rule-400/70 hover:text-ink-900'
              }`}
            >
              <span className={`flex h-4 w-8 rounded-full p-0.5 transition-all duration-300 ease-architect ${project.selections_visible ? 'bg-forest-500 justify-end' : 'bg-paper-200 justify-start'}`}>
                <span className="h-3 w-3 rounded-full bg-paper-50" />
              </span>
              <span className="hidden sm:inline">{project.selections_visible ? 'Visible to Client' : 'Hidden from Client'}</span>
            </button>
          </div>

          <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
            Build selection categories — tile, hardware, countertops — each with the options the homeowner chooses from in their Selections tab.
          </p>

          {/* Existing Categories */}
          {Array.isArray(project?.homeowner_options) && project.homeowner_options.length > 0 && (
            <div className="mt-5 border-t border-rule-300/70">
              {project.homeowner_options.map((group: any, gIdx: number) => {
                const chosen = project?.homeowner_selections?.[group.category];
                return (
                  <div key={gIdx} className="border-b border-rule-300/55">
                    {/* Category Header */}
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
                      {editingCategoryIdx === gIdx ? (
                        <div className="flex w-full items-center gap-2">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editingCategoryName.trim()) {
                                const updated = [...project.homeowner_options];
                                updated[gIdx] = { ...updated[gIdx], category: editingCategoryName.trim() };
                                saveSelectionOptions(updated);
                                setEditingCategoryIdx(null);
                              }
                            }}
                            autoFocus
                            title="Category name"
                            className="field min-w-0 flex-1 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (!editingCategoryName.trim()) return;
                              const updated = [...project.homeowner_options];
                              updated[gIdx] = { ...updated[gIdx], category: editingCategoryName.trim() };
                              saveSelectionOptions(updated);
                              setEditingCategoryIdx(null);
                            }}
                            className="btn-ink shrink-0 px-3 py-1.5"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryIdx(null)}
                            className="btn-quiet shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                          <span className="truncate font-sans text-[13px] tracking-architect text-ink-900">{group.category}</span>
                          {chosen && (
                            <span className="badge badge-approved shrink-0">
                              <span className="badge-dot bg-forest-500" />
                              {chosen}
                            </span>
                          )}
                          {!chosen && (
                            <span className="badge badge-pending shrink-0">
                              <span className="badge-dot bg-bronze-400" />
                              Awaiting Selection
                            </span>
                          )}
                        </div>
                      )}
                      {editingCategoryIdx !== gIdx && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditingCategoryIdx(gIdx); setEditingCategoryName(group.category); }}
                            className="btn-quiet font-sans text-[13px] tracking-architect"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm(`Delete "${group.category}" and all its options?`)) return;
                              const updated = project.homeowner_options.filter((_: any, i: number) => i !== gIdx);
                              const clearedSelections = { ...(project.homeowner_selections || {}) };
                              delete clearedSelections[group.category];
                              saveSelectionOptions(updated, clearedSelections);
                            }}
                            className="btn-quiet font-sans text-[13px] tracking-architect hover:bg-brick-50 hover:text-brick-600"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Choices Grid */}
                    <div className="pb-4">
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                        {group.choices.map((choice: any, cIdx: number) => {
                          const choiceLabel = typeof choice === "string" ? choice : choice.label;
                          const imageUrl = typeof choice === "string" ? undefined : choice.image_url;
                          const productUrl = typeof choice === "string" ? undefined : choice.product_url;
                          const isChosen = chosen === choiceLabel;
                          return (
                            <div
                              key={cIdx}
                              className={`group/choice relative overflow-hidden rounded-edge border transition-all duration-300 ease-architect ${
                                isChosen
                                  ? 'border-rule-300 bg-paper-50 text-ink-900'
                                  : 'border-rule-300 bg-paper-50 text-ink-500 hover:border-rule-400'
                              } ${imageUrl ? 'sm:w-[148px]' : ''}`}
                            >
                              {imageUrl && (
                                <a href={productUrl || imageUrl} target="_blank" rel="noopener noreferrer" className="block">
                                  <img src={imageUrl} alt={choiceLabel} className="h-[86px] w-full object-cover" />
                                </a>
                              )}
                              <div className="flex items-center gap-1.5 px-3 py-2">
                                {isChosen && (
                                  <svg aria-hidden className="h-3 w-3 shrink-0 text-bronze-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                                <span className="truncate text-[12px] font-medium">{choiceLabel}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!confirm(`Remove "${choiceLabel}" from ${group.category}?`)) return;
                                    const updated = [...project.homeowner_options];
                                    updated[gIdx] = {
                                      ...updated[gIdx],
                                      choices: updated[gIdx].choices.filter((_: any, ci: number) => ci !== cIdx)
                                    };
                                    if (isChosen) {
                                      const clearedSelections = { ...(project.homeowner_selections || {}) };
                                      delete clearedSelections[group.category];
                                      saveSelectionOptions(updated, clearedSelections);
                                    } else {
                                      saveSelectionOptions(updated);
                                    }
                                  }}
                                  title={`Remove ${choiceLabel}`}
                                  className={`ml-auto shrink-0 transition-opacity duration-200 ease-architect focus-visible:opacity-100 sm:opacity-0 sm:group-hover/choice:opacity-100 ${
                                    isChosen ? 'text-ink-900/50 hover:text-ink-900' : 'text-ink-400 hover:text-brick-600'
                                  }`}
                                >
                                  <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                              {productUrl && (
                                <a href={productUrl} target="_blank" rel="noopener noreferrer" className={`block px-3 pb-2 font-sans text-[13px] tracking-architect underline-offset-2 hover:underline ${isChosen ? 'text-bronze-300' : 'text-bronze-600'}`}>
                                  Product link
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Add Choice Input */}
                      {addingChoiceIdx === gIdx ? (
                        <div className="mt-3 space-y-2 border-t border-rule-300/55 pt-3">
                          {newChoiceImageUrl && (
                            <div className="flex items-start gap-3">
                              <img src={newChoiceImageUrl} alt="Sample preview" className="h-20 w-20 rounded-edge border border-rule-300/70 object-cover" />
                              <div className="min-w-0 flex-1">
                                <p className="eyebrow text-forest-600">Photo attached</p>
                                <p className="mt-1 truncate font-sans text-[10px] text-ink-500">{newChoiceImageUrl.split('/').pop()}</p>
                              </div>
                            </div>
                          )}
                          <input
                            type="text"
                            value={newChoiceText}
                            onChange={(e) => setNewChoiceText(e.target.value)}
                            autoFocus
                            placeholder="Option name (required)"
                            title="Option name"
                            className="field"
                          />
                          <input
                            type="url"
                            value={newChoiceImageUrl}
                            onChange={(e) => setNewChoiceImageUrl(e.target.value)}
                            placeholder="Image URL (optional — paste manufacturer image link)"
                            title="Image URL"
                            className="field-sunken text-[12px]"
                          />
                          <input
                            type="url"
                            value={newChoiceProductUrl}
                            onChange={(e) => setNewChoiceProductUrl(e.target.value)}
                            placeholder="Product page URL (optional — link to manufacturer page)"
                            title="Product page URL"
                            className="field-sunken text-[12px]"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (!newChoiceText.trim()) return;
                                const updated = [...project.homeowner_options];
                                const newChoice = (newChoiceImageUrl.trim() || newChoiceProductUrl.trim())
                                  ? { label: newChoiceText.trim(), ...(newChoiceImageUrl.trim() && { image_url: newChoiceImageUrl.trim() }), ...(newChoiceProductUrl.trim() && { product_url: newChoiceProductUrl.trim() }) }
                                  : newChoiceText.trim();
                                updated[gIdx] = {
                                  ...updated[gIdx],
                                  choices: [...updated[gIdx].choices, newChoice]
                                };
                                saveSelectionOptions(updated);
                                setNewChoiceText("");
                                setNewChoiceImageUrl("");
                                setNewChoiceProductUrl("");
                                setAddingChoiceIdx(null);
                              }}
                              disabled={!newChoiceText.trim()}
                              className="btn-ink shrink-0"
                            >
                              Add Option
                            </button>
                            <button
                              type="button"
                              onClick={() => { setAddingChoiceIdx(null); setNewChoiceText(""); setNewChoiceImageUrl(""); setNewChoiceProductUrl(""); }}
                              className="btn-quiet"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                            <button
                              type="button"
                              onClick={() => { setAddingChoiceIdx(gIdx); setNewChoiceText(""); setNewChoiceImageUrl(""); setNewChoiceProductUrl(""); }}
                              className="inline-flex items-center gap-1.5 font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 ease-architect hover:text-ink-900"
                            >
                              <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                              Add Option
                            </button>
                            <span aria-hidden className="h-3 w-px bg-paper-200" />
                            <button
                              type="button"
                              disabled={scanningIdx === gIdx}
                              onClick={() => startScan(gIdx)}
                              className="inline-flex items-center gap-1.5 font-sans text-[13px] tracking-architect text-bronze-600 transition-colors duration-200 ease-architect hover:text-bronze-500 disabled:opacity-40"
                            >
                              <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                              {scanningIdx === gIdx ? "Analyzing..." : "Upload / Scan"}
                            </button>
                            <span aria-hidden className="h-3 w-px bg-paper-200" />
                            <button
                              type="button"
                              onClick={() => { setLibrarySearchIdx(librarySearchIdx === gIdx ? null : gIdx); setLibraryQuery(""); setLibraryResults([]); }}
                              className={`inline-flex items-center gap-1.5 font-sans text-[13px] tracking-architect transition-colors duration-200 ease-architect ${librarySearchIdx === gIdx ? 'text-ink-900' : 'text-ink-500 hover:text-ink-900'}`}
                            >
                              <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              Reuse From Library
                            </button>
                          </div>
                          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-500">Upload a photo of a sample — add the back/label photo too so the scan can read the product name.</p>
                        </div>
                      )}

                      {/* Scan step: staged photos before submitting to AI */}
                      {scanStep?.gIdx === gIdx && scanStep.files.length > 0 && (
                        <div className="mt-3 border-l-2 border-bronze-400 bg-bronze-50/50 px-5 py-5">
                          <p className="eyebrow text-bronze-600">Photos staged for scan</p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {scanStep.files.map((f, fIdx) => (
                              <div key={fIdx} className="relative">
                                <img
                                  src={URL.createObjectURL(f)}
                                  alt={`Photo ${fIdx + 1}`}
                                  className="h-16 w-16 rounded-edge border border-bronze-200 object-cover"
                                />
                                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-paper-50 font-sans text-[8px] tabular-nums text-ink-900">
                                  {fIdx + 1}
                                </span>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={addSecondPhoto}
                              title="Add another photo"
                              className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-edge border border-dashed border-bronze-300 text-bronze-500 transition-colors duration-200 ease-architect hover:border-bronze-500 hover:text-bronze-600"
                            >
                              <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                              <span className="font-sans text-[7.5px] tracking-architect">Add</span>
                            </button>
                          </div>
                          <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-500">
                            {scanStep.files.length === 1 ? "Have a back/label photo? Tap + to add it so the scan can read the product name." : `${scanStep.files.length} photos ready — labels are read from all of them.`}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={submitScan}
                              className="btn-brass"
                            >
                              Scan Photos
                            </button>
                            <button
                              type="button"
                              onClick={() => setScanStep(null)}
                              className="btn-quiet"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Library Search Panel */}
                      {librarySearchIdx === gIdx && (
                        <div className="mt-3 border-l-2 border-rule-300 bg-paper-50/70 px-5 py-5">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={libraryQuery}
                              onChange={(e) => searchLibrary(e.target.value)}
                              autoFocus
                              placeholder="Search past selections... (e.g. NeoMatte, quartz, grey)"
                              title="Search the selection library"
                              className="field min-w-0 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => { setLibrarySearchIdx(null); setLibraryQuery(""); setLibraryResults([]); }}
                              title="Close library search"
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-edge text-ink-500 transition-colors duration-200 ease-architect hover:bg-paper-200 hover:text-ink-900"
                            >
                              <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          {libraryLoading && <p className="mt-2.5 font-sans text-[13px] tracking-architect text-ink-500">Searching...</p>}
                          {!libraryLoading && libraryQuery && libraryResults.length === 0 && (
                            <p className="mt-2.5 font-sans text-[13px] tracking-architect text-ink-500">No matches in past projects</p>
                          )}
                          {libraryResults.length > 0 && (
                            <div className="mt-2.5 max-h-52 overflow-y-auto scrollbar-none">
                              {libraryResults.map((item: any, rIdx: number) => (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={() => addFromLibrary(gIdx, item)}
                                  className="flex w-full items-center gap-3 border-b border-rule-300/55 bg-paper-50 px-3 py-2.5 text-left transition-colors duration-200 ease-architect last:border-b-0 hover:bg-paper-100"
                                >
                                  {item.image_url && (
                                    <img src={item.image_url} alt={item.label} className="h-10 w-10 shrink-0 rounded-edge border border-rule-300/70 object-cover" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12.5px] font-medium text-ink-900">{item.label}</p>
                                    <p className="mt-0.5 truncate font-sans text-[13px] tracking-architect text-ink-500">
                                      {item.source_category} &middot; {item.source_project}
                                    </p>
                                  </div>
                                  <span className="badge badge-neutral shrink-0">Add</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {(!project?.homeowner_options || project.homeowner_options.length === 0) && (
            <div className="blueprint-grid mt-5 border border-rule-300/70 px-6 py-14 text-center">
              <p className="display-sm">No selection categories yet</p>
              <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                Add categories below for your client to choose finishes, materials and hardware.
              </p>
            </div>
          )}

          {/* Add New Category */}
          <div className="mt-6 border-t border-rule-300/70 pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="new-selection-category" className="field-label">New Selection Category</label>
                <input
                  id="new-selection-category"
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      const current = Array.isArray(project?.homeowner_options) ? [...project.homeowner_options] : [];
                      const duplicate = current.some((g: any) => g.category.toLowerCase() === newCategoryName.trim().toLowerCase());
                      if (duplicate) return toast("Category already exists.", "info");
                      const updated = [...current, { category: newCategoryName.trim(), choices: [] }];
                      saveSelectionOptions(updated);
                      setNewCategoryName("");
                      toast(`"${newCategoryName.trim()}" added — now add options for the homeowner to choose from.`, "success");
                    }
                  }}
                  placeholder="e.g. Backsplash Tile, Cabinet Hardware, Countertop Material, Paint Color"
                  className="field"
                />
              </div>
              <button
                type="button"
                disabled={!newCategoryName.trim()}
                onClick={() => {
                  if (!newCategoryName.trim()) return;
                  const current = Array.isArray(project?.homeowner_options) ? [...project.homeowner_options] : [];
                  const duplicate = current.some((g: any) => g.category.toLowerCase() === newCategoryName.trim().toLowerCase());
                  if (duplicate) return toast("Category already exists.", "info");
                  const updated = [...current, { category: newCategoryName.trim(), choices: [] }];
                  saveSelectionOptions(updated);
                  setNewCategoryName("");
                  toast(`"${newCategoryName.trim()}" added — now add options for the homeowner to choose from.`, "success");
                }}
                className="btn-ink shrink-0"
              >
                Add Category
              </button>
            </div>
          </div>

          {/* Summary row + Send Reminder */}
          {Array.isArray(project?.homeowner_options) && project.homeowner_options.length > 0 && (
            <div className="mt-5">
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-panel bg-paper-200/60 shadow-riser ring-1 ring-rule-300/50 sm:grid-cols-4">
                <div className="bg-paper-50 px-5 py-4">
                  <p className="eyebrow">Categories</p>
                  <p className="figure mt-1 text-[15px]">{project.homeowner_options.length}</p>
                </div>
                <div className="bg-paper-50 px-5 py-4">
                  <p className="eyebrow">Options</p>
                  <p className="figure mt-1 text-[15px]">{project.homeowner_options.reduce((s: number, g: any) => s + (g.choices?.length || 0), 0)}</p>
                </div>
                <div className="bg-paper-50 px-5 py-4">
                  <p className="eyebrow">Selected</p>
                  <p className="figure mt-1 text-[15px] text-forest-600">
                    {Object.keys(project?.homeowner_selections || {}).length}
                  </p>
                </div>
                <div className="bg-paper-50 px-5 py-4">
                  <p className="eyebrow">Pending</p>
                  <p className="figure mt-1 text-[15px] text-bronze-500">
                    {project.homeowner_options.length - Object.keys(project?.homeowner_selections || {}).length}
                  </p>
                </div>
              </div>
              {project.homeowner_options.length - Object.keys(project?.homeowner_selections || {}).length > 0 && (
                <button
                  type="button"
                  disabled={isSendingSelectionReminder}
                  onClick={async () => {
                    if (!project?.homeowner_email) return toast("No email on file for this client.", "error");
                    setIsSendingSelectionReminder(true);
                    try {
                      const res = await fetch("/api/send-selection-reminder", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          invoice_id: projectId,
                          base_url: window.location.origin,
                        }),
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || "Failed");
                      toast(`Selection reminder sent to ${data.sent_to} — ${data.pending_count} pending ${data.pending_count === 1 ? 'category' : 'categories'}`, "success");
                    } catch (err: any) {
                      toast("Failed to send reminder: " + err.message, "error");
                    } finally {
                      setIsSendingSelectionReminder(false);
                    }
                  }}
                  className="btn-outline mt-3 w-full border-bronze-200 text-bronze-600 hover:border-bronze-400 hover:bg-bronze-50"
                >
                  <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  {isSendingSelectionReminder ? "Sending..." : "Send Selection Reminder"}
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* FIELD OPERATIONS DAILY LOG WORKBENCH WITH CAMERA ATTACHMENTS RESTORED */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">07</span>
            <h2 className="display-sm">Field Log</h2>
          </div>
          <span className="eyebrow hidden sm:block">Site Record</span>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Record site progress and capture photographs straight from the device camera into the client portal.
        </p>

        <form onSubmit={submitDailyOperationsLog} className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
          <div className="panel-sunken flex flex-col gap-4 p-4">
            <div>
              <label htmlFor="daily-log-notes" className="field-label">Site Progress Notes</label>
              <textarea
                id="daily-log-notes"
                value={dailyNotes}
                onChange={(e) => setDailyNotes(e.target.value)}
                placeholder="Describe trade workflow status..."
                className="field min-h-[96px] resize-y leading-relaxed"
              />

              {/* IMAGE DROPZONE FIELD INPUT SYSTEM */}
              <label className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-edge border border-dashed border-rule-300 px-3 py-2.5 text-center font-sans text-[13px] tracking-architect text-ink-500 transition-colors duration-200 ease-architect hover:border-rule-400 hover:text-ink-900">
                <svg aria-hidden className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                <span className="truncate">{attachedPhotoName ? `${attachedPhotoName.slice(0, 20)}...` : "Capture Site Photo"}</span>
                <input type="file" accept="image/*" capture="environment" onChange={handleDailyLogPhotoLoad} className="hidden" />
              </label>
            </div>
            <button
              type="submit"
              disabled={isLogging || (!dailyNotes.trim() && !attachedPhotoBase64)}
              className="btn-ink w-full py-3"
            >
              {isLogging ? "Saving Log..." : "Save Log"}
            </button>
          </div>

          <div className="max-h-[320px] overflow-y-auto border-t border-rule-300/70 pr-1 scrollbar-none">
            {Array.isArray(project?.daily_logs) && project.daily_logs.map((log: any, i: number) => (
              <div key={i} className="border-b border-rule-300/55 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-sans text-[13px] tracking-architect text-ink-500">{log.author || "Site Superintendent"}</span>
                  <span className="font-sans text-[10px] tabular-nums text-ink-500">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
                <div className="mt-2 space-y-3">
                  {log.notes && <p className="text-[12.5px] leading-relaxed text-ink-500">{log.notes}</p>}
                  {log.photo && (
                    <div className="max-w-xs overflow-hidden rounded-edge border border-rule-300/70 bg-paper-50">
                      <img src={log.photo} alt="Site progress attachment" className="h-auto max-h-44 w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            ))}
            {(!project?.daily_logs || project.daily_logs.length === 0) && (
              <div className="blueprint-grid px-6 py-14 text-center">
                <p className="display-sm">No field records yet</p>
                <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                  Entries you save here appear on the homeowner portal timeline.
                </p>
              </div>
            )}
          </div>
        </form>
      </section>

      {/* CONTRACTOR NOTES */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">08</span>
            <h2 className="display-sm">Contractor Notes</h2>
          </div>
          <span className="eyebrow hidden sm:block">Internal</span>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Private notes for your own reference. Toggle a note visible to share it with the homeowner.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="new-contractor-note" className="sr-only">New note</label>
            <textarea
              id="new-contractor-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              rows={2}
              className="field resize-none leading-relaxed"
            />
          </div>
          <button
            type="button"
            disabled={isSavingNote || !newNote.trim()}
            onClick={async () => {
              if (!newNote.trim()) return;
              setIsSavingNote(true);
              try {
                const note = { text: newNote.trim(), timestamp: new Date().toISOString(), visible: false };
                const current = Array.isArray(project?.contractor_notes) ? [...project.contractor_notes] : [];
                const updated = [note, ...current];
                const { error } = await supabase.from("invoices").update({ contractor_notes: updated }).eq("id", projectId);
                if (error) throw error;
                setProject((prev: any) => ({ ...prev, contractor_notes: updated }));
                setNewNote("");
                toast("Note saved", "success");
              } catch (err: any) {
                toast("Failed to save note: " + err.message, "error");
              } finally {
                setIsSavingNote(false);
              }
            }}
            className="btn-ink shrink-0 py-3"
          >
            {isSavingNote ? "Saving..." : "Save"}
          </button>
        </div>

        <div className="mt-5 max-h-[340px] overflow-y-auto border-t border-rule-300/70 scrollbar-none">
          {Array.isArray(project?.contractor_notes) && project.contractor_notes.map((note: any, i: number) => (
            <div key={i} className="group relative border-b border-rule-300/55 py-3.5 transition-colors duration-300 ease-architect hover:bg-paper-50">
              <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-bronze-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-4 sm:pl-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-ink-500">{note.text}</p>
                  <p className="mt-1.5 font-sans text-[10px] tabular-nums text-ink-500">
                    {new Date(note.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = [...project.contractor_notes];
                      updated[i] = { ...updated[i], visible: !updated[i].visible };
                      const { error } = await supabase.from("invoices").update({ contractor_notes: updated }).eq("id", projectId);
                      if (error) { toast("Failed to update visibility", "error"); return; }
                      setProject((prev: any) => ({ ...prev, contractor_notes: updated }));
                    }}
                    className={`badge transition-colors duration-200 ease-architect ${
                      note.visible
                        ? "badge-approved hover:bg-forest-100"
                        : "badge-neutral hover:bg-paper-200"
                    }`}
                  >
                    <svg aria-hidden className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      {note.visible
                        ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        : <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      }
                    </svg>
                    {note.visible ? "Visible" : "Hidden"}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm("Delete this note?")) return;
                      const updated = project.contractor_notes.filter((_: any, idx: number) => idx !== i);
                      const { error } = await supabase.from("invoices").update({ contractor_notes: updated }).eq("id", projectId);
                      if (error) { toast("Failed to delete note", "error"); return; }
                      setProject((prev: any) => ({ ...prev, contractor_notes: updated }));
                    }}
                    title="Delete note"
                    className="flex h-7 w-7 items-center justify-center rounded-edge text-ink-400 transition-all duration-200 ease-architect hover:bg-brick-50 hover:text-brick-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
          {(!project?.contractor_notes || project.contractor_notes.length === 0) && (
            <div className="blueprint-grid px-6 py-12 text-center">
              <p className="display-sm">No notes yet</p>
              <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                Keep internal observations about this project here.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Q&A COMMUNICATION THREAD */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">09</span>
            <h2 className="display-sm">Messages</h2>
          </div>
          <span className="eyebrow hidden sm:block">Client Thread</span>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Messages sent here appear on the homeowner portal — use the thread to answer questions and move toward approval.
        </p>

        <div className="panel-sunken mt-4 max-h-[340px] space-y-3 overflow-y-auto p-3 scrollbar-none sm:p-4">
          {Array.isArray(project?.questions) && project.questions.length > 0 ? (
            project.questions.map((msg: any, i: number) => (
              <div key={i} className={`flex ${msg.author === "contractor" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[88%] rounded-edge text-[12.5px] leading-relaxed sm:max-w-[75%] ${
                  msg.author === "contractor"
                    ? "bg-paper-50 text-ink-900"
                    : "border border-rule-300/70 bg-paper-50 text-ink-500"
                }`}>
                  {editingQaIndex === i ? (
                    <div className="space-y-2 px-3.5 py-2.5">
                      <label htmlFor={`qa-edit-${i}`} className="sr-only">Edit message</label>
                      <textarea
                        id={`qa-edit-${i}`}
                        value={editingQaText}
                        onChange={(e) => setEditingQaText(e.target.value)}
                        className="min-h-[52px] w-full rounded-edge border border-rule-300/15 bg-paper-100 p-2.5 text-[12.5px] leading-relaxed text-ink-900 outline-none transition-colors duration-200 ease-architect focus:border-rule-300/40"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingQaIndex(null)}
                          className="rounded-edge px-2 py-1 font-sans text-[13px] tracking-architect text-ink-900/50 transition-colors duration-200 ease-architect hover:text-ink-900"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!editingQaText.trim()) return;
                            const currentMessages = [...(project?.questions || [])];
                            currentMessages[i] = { ...currentMessages[i], text: editingQaText.trim(), edited: true };
                            try {
                              const { error } = await supabase.from("invoices").update({ questions: currentMessages }).eq("id", projectId);
                              if (error) throw error;
                              setProject((prev: any) => ({ ...prev, questions: currentMessages }));
                              setEditingQaIndex(null);
                            } catch (err: any) {
                              toast("Failed to update message: " + err.message, "error");
                            }
                          }}
                          className="rounded-edge border border-rule-300/20 px-2.5 py-1 font-sans text-[13px] tracking-architect text-bronze-300 transition-colors duration-200 ease-architect hover:border-rule-300/45 hover:text-bronze-200"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="px-3.5 py-2.5">
                      {msg.image_url && (
                        <a href={msg.image_url} target="_blank" rel="noopener noreferrer" className="mb-2 block">
                          <img src={msg.image_url} alt="Attachment" className="max-h-48 max-w-full rounded-edge border border-rule-300/10" />
                        </a>
                      )}
                      {msg.text && <p>{msg.text}{msg.edited && <span className="ml-1.5 font-sans text-[13px] tracking-architect opacity-50">edited</span>}</p>}
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p className={`font-sans text-[13px] tracking-architect ${msg.author === "contractor" ? "text-ink-900/45" : "text-ink-500"}`}>
                          {msg.author === "contractor" ? "You" : project?.homeowner_name || "Homeowner"} · {new Date(msg.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                        {msg.author === "contractor" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => { setEditingQaIndex(i); setEditingQaText(msg.text); }}
                              className="font-sans text-[13px] tracking-architect text-ink-900/45 transition-colors duration-200 ease-architect hover:text-ink-900"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm("Delete this message?")) return;
                                const currentMessages = [...(project?.questions || [])];
                                currentMessages.splice(i, 1);
                                try {
                                  const { error } = await supabase.from("invoices").update({ questions: currentMessages }).eq("id", projectId);
                                  if (error) throw error;
                                  setProject((prev: any) => ({ ...prev, questions: currentMessages }));
                                } catch (err: any) {
                                  toast("Failed to delete message: " + err.message, "error");
                                }
                              }}
                              className="font-sans text-[13px] tracking-architect text-brick-200/70 transition-colors duration-200 ease-architect hover:text-brick-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="blueprint-grid px-6 py-12 text-center">
              <p className="display-sm">No messages yet</p>
              <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
                Open the conversation to guide your client toward approval.
              </p>
            </div>
          )}
        </div>

        {qaAttachment && (
          <div className="mt-3 flex items-center gap-3 rounded-edge border border-rule-300/70 bg-paper-50 px-3 py-2">
            <img src={qaAttachment.preview} alt="Attached" className="h-12 w-12 rounded-edge border border-rule-300/70 object-cover" />
            <span className="min-w-0 flex-1 truncate font-sans text-[10.5px] text-ink-500">{qaAttachment.file.name}</span>
            <button
              type="button"
              onClick={() => { URL.revokeObjectURL(qaAttachment.preview); setQaAttachment(null); }}
              title="Remove attachment"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-edge text-ink-400 transition-colors duration-200 ease-architect hover:bg-brick-50 hover:text-brick-600"
            >
              <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!qaMessage.trim() && !qaAttachment) return;
            setIsSendingQa(true);
            try {
              let imageUrl = "";
              if (qaAttachment) {
                const file = qaAttachment.file;
                const arrayBuffer = await file.arrayBuffer();
                const filePath = `messages/${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                const { error: uploadErr } = await supabase.storage
                  .from("project-photos")
                  .upload(filePath, new Uint8Array(arrayBuffer), { contentType: file.type || "image/jpeg" });
                if (!uploadErr) {
                  const { data: urlData } = supabase.storage.from("project-photos").getPublicUrl(filePath);
                  imageUrl = urlData.publicUrl;
                } else {
                  console.error("Message photo upload failed:", uploadErr.message);
                }
                URL.revokeObjectURL(qaAttachment.preview);
                setQaAttachment(null);
              }
              const newMsg: any = { text: qaMessage.trim(), author: "contractor", timestamp: new Date().toISOString() };
              if (imageUrl) newMsg.image_url = imageUrl;
              const currentMessages = Array.isArray(project?.questions) ? [...project.questions] : [];
              const updated = [...currentMessages, newMsg];
              const { error } = await supabase.from("invoices").update({ questions: updated }).eq("id", projectId);
              if (error) throw error;
              setProject((prev: any) => ({ ...prev, questions: updated }));
              if (project?.homeowner_email) {
                fetch("/api/send-message-notification", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    homeowner_name: project.homeowner_name,
                    homeowner_email: project.homeowner_email,
                    project_title: project.project_title,
                    job_address: project.job_address,
                    message_text: newMsg.text || "Sent a photo",
                    portal_url: `${window.location.origin}/invoice/${projectId}`,
                  }),
                }).catch(() => {});
              }
              setQaMessage("");
            } catch (err: any) {
              toast("Failed to send message: " + err.message, "error");
            } finally {
              setIsSendingQa(false);
            }
          }}
          className="mt-3 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = "image/*";
              input.onchange = (ev) => {
                const f = (ev.target as HTMLInputElement).files?.[0];
                if (f) {
                  if (qaAttachment) URL.revokeObjectURL(qaAttachment.preview);
                  setQaAttachment({ file: f, preview: URL.createObjectURL(f) });
                }
              };
              input.click();
            }}
            className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-edge border border-rule-300/70 bg-paper-50 text-ink-500 transition-colors duration-200 ease-architect hover:border-rule-400 hover:bg-paper-100 hover:text-ink-900"
            title="Attach photo"
          >
            <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <label htmlFor="qa-message" className="sr-only">Reply to client</label>
          <input
            id="qa-message"
            type="text"
            value={qaMessage}
            onChange={(e) => setQaMessage(e.target.value)}
            placeholder="Type a reply to your client..."
            className="field min-w-0 flex-1"
          />
          <button
            type="submit"
            disabled={isSendingQa || (!qaMessage.trim() && !qaAttachment)}
            className="btn-ink shrink-0 px-4"
          >
            {isSendingQa ? "Sending..." : "Send"}
          </button>
        </form>
      </section>

      {/* PROJECT DOCUMENTS UPLOAD */}
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
        <div className="title-block">
          <div className="flex items-baseline gap-3">
            <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">10</span>
            <h2 className="display-sm">Documents</h2>
          </div>
          <span className="eyebrow hidden sm:block">Drawing Set</span>
        </div>

        <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
          Contracts, permits and plans uploaded here appear in the homeowner&apos;s Docs tab.
        </p>

        <label className={`mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-edge border border-dashed border-rule-300 py-5 transition-colors duration-200 ease-architect hover:border-rule-400 ${isUploadingDoc ? 'pointer-events-none opacity-50' : ''}`}>
          <svg aria-hidden className="h-4 w-4 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0l-3 3m3-3l3 3M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /></svg>
          <span className="font-sans text-[13px] tracking-architect text-ink-500">{isUploadingDoc ? "Uploading..." : "Upload Document"}</span>
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.heic"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setIsUploadingDoc(true);
              try {
                const filePath = `project-docs/${projectId}/${Date.now()}-${file.name}`;
                const { error: uploadError } = await supabase.storage
                  .from("project-photos")
                  .upload(filePath, file);
                if (uploadError) throw uploadError;
                const { data: urlData } = supabase.storage
                  .from("project-photos")
                  .getPublicUrl(filePath);
                const docEntry = {
                  name: file.name,
                  url: urlData.publicUrl,
                  uploaded_at: new Date().toISOString(),
                  size: file.size
                };
                const currentDocs = Array.isArray(project?.documents) ? [...project.documents] : [];
                const updatedDocs = [...currentDocs, docEntry];
                const { error } = await supabase.from("invoices").update({ documents: updatedDocs }).eq("id", projectId);
                if (error) throw error;
                setProject((prev: any) => ({ ...prev, documents: updatedDocs }));
                toast("Document uploaded", "success");
              } catch (err: any) {
                toast("Upload failed: " + err.message, "error");
              } finally {
                setIsUploadingDoc(false);
                e.target.value = "";
              }
            }}
          />
        </label>

        {Array.isArray(project?.documents) && project.documents.length > 0 ? (
          <div className="mt-5 border-t border-rule-300/70">
            {project.documents.map((doc: any, i: number) => (
              <div key={i} className="group relative flex items-center justify-between gap-3 border-b border-rule-300/55 py-3 transition-colors duration-300 ease-architect hover:bg-paper-50">
                <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-bronze-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />
                <div className="flex min-w-0 items-center gap-3 sm:pl-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-edge border border-rule-300 bg-paper-50 font-sans text-[13px] tracking-architect text-ink-500">{doc.name?.split('.').pop()?.slice(0, 4)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-ink-900">{doc.name}</p>
                    <p className="mt-0.5 font-sans text-[13px] tracking-architect text-ink-500">
                      {new Date(doc.uploaded_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {doc.size && ` · ${(doc.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline px-3 py-1.5 font-sans text-[13px] tracking-architect"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Remove "${doc.name}"?`)) return;
                      const updatedDocs = project.documents.filter((_: any, idx: number) => idx !== i);
                      setProject((prev: any) => ({ ...prev, documents: updatedDocs }));
                      const { error } = await supabase.from("invoices").update({ documents: updatedDocs }).eq("id", projectId);
                      if (error) toast("Failed to remove: " + error.message, "error");
                    }}
                    title={`Remove ${doc.name}`}
                    className="flex h-7 w-7 items-center justify-center rounded-edge text-ink-400 transition-all duration-200 ease-architect hover:bg-brick-50 hover:text-brick-600 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="blueprint-grid mt-5 border border-rule-300/70 px-6 py-12 text-center">
            <p className="display-sm">No documents yet</p>
            <p className="mx-auto mt-2 max-w-xs text-[12.5px] leading-relaxed text-ink-500">
              Upload contracts, permits and plan sets for the client record.
            </p>
          </div>
        )}
      </section>

      {/* CHANGE ORDERS — only post-approval */}
      {project?.status === "approved" && (
        <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-8">
          <div className="title-block">
            <div className="flex items-baseline gap-3">
              <span className="font-sans text-[10px] font-medium tracking-architect text-bronze-500">11</span>
              <h2 className="display-sm">Change Orders</h2>
            </div>
            <span className="eyebrow hidden sm:block">Post-Contract</span>
          </div>

          <p className="max-w-2xl text-[12.5px] leading-relaxed text-ink-500">
            Draft scope modifications with AI-generated line items. Deployed change orders appear on the homeowner portal for approval.
          </p>

          {/* Existing Change Orders */}
          {changeOrders.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow border-b border-rule-300/70 pb-2.5">Deployed Change Orders</p>
              {changeOrders.map((co: any) => (
                <div key={co.id} className="group relative flex items-start justify-between gap-4 border-b border-rule-300/55 py-3.5 transition-colors duration-300 ease-architect hover:bg-paper-50">
                  <span aria-hidden className="absolute bottom-0 left-0 top-0 w-px origin-top scale-y-0 bg-bronze-400 opacity-0 transition-all duration-300 ease-architect group-hover:scale-y-100 group-hover:opacity-100" />
                  <div className="min-w-0 sm:pl-3">
                    {co.proposal_number && (
                      <p className="font-sans text-[10px] tracking-architect text-ink-400">{co.proposal_number}</p>
                    )}
                    <p className="mt-1 truncate text-[13px] font-medium text-ink-900">{co.description || co.project_title || "Change Order"}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span className={`badge ${co.status === 'approved' ? 'badge-approved' : 'badge-pending'}`}>
                        <span className={`badge-dot ${co.status === 'approved' ? 'bg-forest-500' : 'bg-bronze-400'}`} />
                        {co.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                      {co.status === 'approved' && (
                        <span className={`badge ${co.deposit_cleared ? 'badge-neutral' : 'badge-declined'}`}>
                          {co.deposit_cleared ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="figure shrink-0 text-[14px]">
                    ${toNum(co.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Create New Change Order */}
          <div className="panel-sunken mt-6 p-5 sm:p-7">
            <p className="eyebrow-ink">Create Change Order</p>
            <div className="mt-3.5">
              <label htmlFor="co-description" className="field-label">Describe the additional scope</label>
              <textarea
                id="co-description"
                value={coDescription}
                onChange={(e) => setCoDescription(e.target.value)}
                placeholder="e.g. Add recessed lighting to living room, 6 cans on dimmers, patch and paint ceiling..."
                className="field min-h-[84px] resize-y leading-relaxed"
                rows={3}
              />
            </div>
            <button
              type="button"
              disabled={isGeneratingCo || !coDescription.trim()}
              onClick={async () => {
                setIsGeneratingCo(true);
                setCoItems([]);
                try {
                  const res = await fetch("/api/generate-scope", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      prompt: coDescription,
                      address: project?.job_address || "",
                      zipcode: "Omaha",
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || "Generation failed");
                  setCoItems(data.items || []);
                } catch (err: any) {
                  toast("AI generation failed: " + err.message, "error");
                } finally {
                  setIsGeneratingCo(false);
                }
              }}
              className="btn-ink mt-4"
            >
              {isGeneratingCo ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border border-rule-300/40 border-t-ink-900" />
                  Generating...
                </>
              ) : (
                <>
                  <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  Generate Line Items
                </>
              )}
            </button>

            {/* Generated Items Preview */}
            {coItems.length > 0 && (
              <div className="mt-5 border-t border-rule-300/70 pt-4">
                <p className="eyebrow">Generated Items — edit costs before deploying</p>
                <div className="mt-2">
                  {coItems.map((item: any, idx: number) => (
                    <div key={idx} className="border-b border-rule-300/55 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <input
                          type="text"
                          value={item.title || ""}
                          onChange={(e) => {
                            const updated = [...coItems];
                            updated[idx] = { ...updated[idx], title: e.target.value };
                            setCoItems(updated);
                          }}
                          title="Change order line title"
                          className="min-w-0 flex-1 border-0 border-b border-transparent bg-transparent py-1 text-[13px] font-medium text-ink-900 outline-none transition-colors duration-200 ease-architect hover:border-rule-300/70 focus:border-rule-400"
                        />
                        <div className="flex shrink-0 items-center gap-1 rounded-edge border border-rule-300/70 bg-paper-50 px-2 transition-colors duration-200 ease-architect focus-within:border-rule-400">
                          <span className="font-sans text-[10px] text-ink-400">$</span>
                          <input
                            type="number"
                            value={item.mid_cost || ""}
                            onChange={(e) => {
                              const updated = [...coItems];
                              updated[idx] = { ...updated[idx], mid_cost: toNum(e.target.value) };
                              setCoItems(updated);
                            }}
                            title="Change order line cost"
                            className="no-spin tnum w-20 bg-transparent py-1.5 text-right text-[12.5px] font-medium text-ink-900 outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setCoItems(coItems.filter((_, i) => i !== idx))}
                          title="Remove line"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-edge text-ink-400 transition-colors duration-200 ease-architect hover:bg-brick-50 hover:text-brick-600"
                        >
                          <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-500">{item.mid_description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-baseline gap-2.5">
                    <span className="eyebrow">Total</span>
                    <span className="figure text-[17px]">
                      ${coItems.reduce((s, i) => s + toNum(i.mid_cost), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isDeployingCo || coItems.length === 0}
                    onClick={async () => {
                      if (!confirm("Deploy this change order to the homeowner portal?")) return;
                      setIsDeployingCo(true);
                      try {
                        const finalItems = coItems.map((item) => ({
                          title: item.title,
                          description: item.mid_description,
                          cost: toNum(item.mid_cost),
                        }));
                        const totalAmount = finalItems.reduce((s, i) => s + i.cost, 0);
                        // A change order hangs off the proposal's number
                        // instead of taking one of its own: PRO-2026-0007-CO1.
                        const coNumber = project?.proposal_number
                          ? formatChangeOrderNumber(project.proposal_number, changeOrders.length + 1)
                          : null;
                        const { error } = await supabase.from("invoices").insert({
                          parent_id: projectId,
                          ...(coNumber
                            ? {
                                proposal_number: coNumber,
                                sequence_year: project?.sequence_year ?? null,
                                sequence_no: project?.sequence_no ?? null,
                                estimate_number: project?.estimate_number ?? null,
                              }
                            : {}),
                          homeowner_name: project?.homeowner_name,
                          homeowner_email: project?.homeowner_email,
                          job_address: project?.job_address,
                          project_title: project?.project_title,
                          description: coDescription,
                          items: finalItems,
                          amount: totalAmount,
                          status: "pending",
                          deposit_percentage: 0,
                          payment_phases: [{ name: "Full Payment", percentage: 100 }],
                        });
                        if (error) throw error;
                        toast("Change order deployed", "success");
                        setCoDescription("");
                        setCoItems([]);
                        fetchComprehensiveProjectData();
                      } catch (err: any) {
                        toast("Failed to deploy: " + err.message, "error");
                      } finally {
                        setIsDeployingCo(false);
                      }
                    }}
                    className="btn-ink shrink-0"
                  >
                    {isDeployingCo ? "Deploying..." : "Deploy Change Order"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* CLIENT SPEC PROFILE INTERACTION MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-50/55 p-3 backdrop-blur-[3px] sm:p-7">
          <div className="w-full max-w-lg animate-rise overflow-hidden rounded-sheet shadow-lift ring-1 ring-rule-300/60 bg-paper-50 text-left shadow-lift">
            <div className="border-b border-rule-300/70 bg-paper-50 px-6 py-5 text-ink-900 sm:px-6">
              <p className="eyebrow-invert">Record</p>
              <h3 className="mt-1.5 display-md">Client Profile</h3>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-7 sm:px-6">
              <p className="text-[12px] leading-relaxed text-ink-500">
                Updates sync instantly to the homeowner portal and the downstream document set.
              </p>

              <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="edit-client-name" className="field-label">Homeowner Name</label>
                  <input
                    id="edit-client-name"
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="field"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-email" className="field-label">Email Address</label>
                  <input
                    id="edit-client-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="field font-sans text-[12px]"
                  />
                </div>
                <div>
                  <label htmlFor="edit-client-phone" className="field-label">Phone Number</label>
                  <input
                    id="edit-client-phone"
                    type="tel"
                    inputMode="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="field font-sans text-[12px]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-client-address" className="field-label">Project Site Address</label>
                  <input
                    id="edit-client-address"
                    type="text"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="field"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="edit-project-title" className="field-label">Project Title</label>
                  <input
                    id="edit-project-title"
                    type="text"
                    value={editProjectTitle}
                    onChange={(e) => setEditProjectTitle(e.target.value)}
                    placeholder="e.g. Bath Remodel, Basement Finish, Kitchen Remodel"
                    className="field"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-rule-300/70 bg-paper-100 px-6 py-5 sm:px-6">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveClientProfileModifications}
                disabled={isSaving}
                className="btn-ink"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Email Preview Modal */}
      {depositPreviewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper-50/60 p-3 backdrop-blur-[3px] sm:p-7" onClick={() => setDepositPreviewHtml(null)}>
          <div className="flex max-h-[90vh] w-full max-w-2xl animate-rise flex-col overflow-hidden rounded-sheet shadow-lift ring-1 ring-rule-300/60 bg-paper-50 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-rule-300/70 bg-paper-50 px-6 py-5 text-ink-900 sm:px-6">
              <div className="min-w-0">
                <p className="eyebrow-invert">Preview</p>
                <h3 className="mt-1.5 display-md">Deposit Email</h3>
                <p className="mt-2 truncate font-sans text-[10.5px] text-ink-900/55">{project?.homeowner_email}</p>
              </div>
              <button
                type="button"
                onClick={() => setDepositPreviewHtml(null)}
                title="Close preview"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-edge text-ink-900/55 transition-colors duration-200 ease-architect hover:bg-paper-50/10 hover:text-ink-900"
              >
                <svg aria-hidden className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-paper-50 p-1">
              <iframe
                srcDoc={depositPreviewHtml}
                className="w-full rounded-edge border-0"
                style={{ minHeight: "600px" }}
                title="Deposit email preview"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-rule-300/70 bg-paper-100 px-6 py-5 sm:px-6">
              <button
                type="button"
                onClick={() => setDepositPreviewHtml(null)}
                className="btn-outline"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSendingDeposit}
                onClick={async () => {
                  setIsSendingDeposit(true);
                  try {
                    const res = await fetch("/api/send-deposit-email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ invoice_id: projectId, base_url: window.location.origin }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || "Failed");
                    toast(`Deposit email sent to ${data.sent_to}`, "success");
                    setDepositPreviewHtml(null);
                  } catch (err: any) {
                    toast("Send failed: " + err.message, "error");
                  } finally {
                    setIsSendingDeposit(false);
                  }
                }}
                className="btn-ink"
              >
                <svg aria-hidden className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                {isSendingDeposit ? "Sending..." : "Send to Client"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}