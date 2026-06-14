"use client"

import { useState } from "react"
import { ImportForm } from "./import-form"
import { ProfileBuilder } from "./profile-builder"
import type { ProfileFormValues } from "@/lib/schemas/profile"

interface ProfileFlowProps {
  existingValues?: Partial<ProfileFormValues>
  isEditing: boolean
}

export function ProfileFlow({ existingValues, isEditing }: ProfileFlowProps) {
  const [stage, setStage] = useState<"import" | "build">(isEditing ? "build" : "import")
  const [importedValues, setImportedValues] = useState<Partial<ProfileFormValues>>({})

  function handleImported(values: Partial<ProfileFormValues>) {
    setImportedValues(values)
    setStage("build")
  }

  if (stage === "import") {
    return (
      <ImportForm
        onImported={handleImported}
        onSkip={() => setStage("build")}
      />
    )
  }

  const mergedValues = { ...importedValues, ...existingValues }

  return <ProfileBuilder defaultValues={mergedValues} />
}
