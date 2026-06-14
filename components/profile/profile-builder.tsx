"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { saveProfile } from "@/lib/actions/profile"
import {
  profileSchema,
  STEP_FIELDS,
  UNION_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  NUDITY_OPTIONS,
  type ProfileFormValues,
} from "@/lib/schemas/profile"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TagInput } from "./tag-input"
import { MultiSelect } from "./multi-select"

const STEPS = [
  { title: "Identity", description: "Your name, union status, and how you present" },
  { title: "Physical", description: "Appearance attributes casting directors filter by" },
  { title: "Location", description: "Where you work and how far you travel" },
  { title: "Skills & Training", description: "What you can do and how you were trained" },
  { title: "Rep & Materials", description: "Representation, links, and business details" },
]

const UNION_LABELS: Record<string, string> = {
  "sag-aftra": "SAG-AFTRA",
  "aea": "AEA (Equity)",
  "aftra": "AFTRA",
  "non-union": "Non-Union",
  "fi-core": "Fi-Core",
  "eligible": "Eligible",
}

const PROJECT_LABELS: Record<string, string> = {
  "film": "Film",
  "tv": "TV",
  "commercial": "Commercial",
  "theater": "Theater",
  "voiceover": "Voiceover",
  "student": "Student",
  "web-series": "Web Series",
  "motion-capture": "Motion Capture",
}

const NUDITY_LABELS: Record<string, string> = {
  "none": "None",
  "implied-only": "Implied only",
  "partial": "Partial",
  "full": "Full",
}

export function ProfileBuilder({ defaultValues }: { defaultValues?: Partial<ProfileFormValues> }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      legal_name: "",
      stage_name: "",
      pronouns: "",
      bio: "",
      union_status: [],
      gender_identity: "",
      age_range_low: 18,
      age_range_high: 35,
      height_cm: undefined,
      weight_lbs: undefined,
      hair_color: "",
      eye_color: "",
      hair_length: "",
      body_type: "",
      ethnicity_self_id: [],
      distinctive_features: "",
      location_primary: "",
      location_secondary: [],
      travel_radius_miles: undefined,
      willing_to_relocate: undefined,
      work_authorization: "",
      character_types: [],
      project_type_preferences: [],
      skills: [],
      languages: ["English"],
      accent_capabilities: [],
      voice_type: "",
      training: [],
      nudity_comfort: undefined,
      rep_status: "self-submit",
      rep_agency: "",
      rate_floor: undefined,
      conflict_brands: [],
      reel_url: "",
      resume_url: "",
      imdb_url: "",
      actors_access_url: "",
      backstage_url: "",
      casting_networks_url: "",
      shirt_size: "",
      pants_size: "",
      shoe_size: "",
      ...defaultValues,
    },
    mode: "onTouched",
  })

  async function nextStep() {
    const valid = await form.trigger(STEP_FIELDS[step])
    if (valid) setStep((s) => s + 1)
  }

  async function handleSave() {
    const valid = await form.trigger()
    if (!valid) return
    setSaving(true)
    setServerError(null)
    const result = await saveProfile(form.getValues())
    if (result?.error) {
      setServerError(result.error)
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex gap-2">
        {STEPS.map((s, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{STEPS[step].title}</CardTitle>
          <CardDescription>{STEPS[step].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-5">

              {/* Step 1 — Identity */}
              {step === 0 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="legal_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="stage_name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stage name <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="pronouns" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pronouns <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. she/her, they/them" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="gender_identity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender identity</FormLabel>
                        <FormControl><Input placeholder="e.g. Woman, Man, Non-binary" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="union_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Union status</FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={UNION_OPTIONS}
                          value={field.value}
                          onChange={field.onChange}
                          labels={UNION_LABELS}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="age_range_low" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plays age (min)</FormLabel>
                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="age_range_high" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plays age (max)</FormLabel>
                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="bio" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Short bio <span className="text-muted-foreground">(optional, max 500 chars)</span></FormLabel>
                      <FormControl><Textarea placeholder="A brief professional introduction..." className="resize-none" rows={3} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 2 — Physical */}
              {step === 1 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="height_cm" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Height (cm) <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="weight_lbs" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weight (lbs) <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="hair_color" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hair color <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Brown, Blonde, Black" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="eye_color" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Eye color <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Brown, Blue, Green" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="hair_length" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hair length <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Short, Medium, Long" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="body_type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Body type <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input placeholder="e.g. Athletic, Average, Larger" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="ethnicity_self_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ethnicity <span className="text-muted-foreground">(optional, self-identified)</span></FormLabel>
                      <FormControl>
                        <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="Type and press Enter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="distinctive_features" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Distinctive features <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. Tattoos, birthmarks, scars" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 3 — Location & Availability */}
              {step === 2 && (
                <>
                  <FormField control={form.control} name="location_primary" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Primary market</FormLabel>
                      <FormControl><Input placeholder="e.g. Los Angeles, CA" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location_secondary" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Secondary markets <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. New York, NY" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="travel_radius_miles" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel radius (miles) <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="willing_to_relocate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Willing to relocate <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <Select onValueChange={v => field.onChange(v === "yes")} value={field.value === true ? "yes" : field.value === false ? "no" : ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="yes">Yes</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="work_authorization" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work authorization <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. US Citizen, Work Visa, EU Passport" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 4 — Skills & Training */}
              {step === 3 && (
                <>
                  <FormField control={form.control} name="project_type_preferences" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project types <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <MultiSelect
                          options={PROJECT_TYPE_OPTIONS}
                          value={field.value ?? []}
                          onChange={field.onChange}
                          labels={PROJECT_LABELS}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="character_types" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Character types <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. Leading Lady, Character Actor, Villain" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="skills" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special skills</FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} placeholder="Type a skill, press Enter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="languages" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Languages</FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} placeholder="Type a language, press Enter" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="accent_capabilities" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent capabilities <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} placeholder="e.g. British RP, Southern US" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="voice_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Voice type <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input placeholder="e.g. Soprano, Tenor, Mezzo, Baritone" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="training" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Training <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <TagInput value={field.value ?? []} onChange={field.onChange} placeholder="e.g. Juilliard, Meisner technique, UCB" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="nudity_comfort" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nudity comfort level <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? ""}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {NUDITY_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{NUDITY_LABELS[opt]}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </>
              )}

              {/* Step 5 — Rep & Materials */}
              {step === 4 && (
                <>
                  <FormField control={form.control} name="rep_status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Representation status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="represented">Represented</SelectItem>
                          <SelectItem value="self-submit">Self-submit</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rep_agency" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Agency / manager <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rate_floor" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rate floor (USD/day) <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl><Input type="number" value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="conflict_brands" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commercial conflicts <span className="text-muted-foreground">(optional)</span></FormLabel>
                      <FormControl>
                        <TagInput value={field.value} onChange={field.onChange} placeholder="e.g. Nike, Apple" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <p className="text-sm font-medium pt-2">Links</p>
                  <div className="space-y-3">
                    {[
                      { name: "reel_url" as const, label: "Reel URL", placeholder: "https://vimeo.com/..." },
                      { name: "resume_url" as const, label: "Resume URL", placeholder: "https://..." },
                      { name: "imdb_url" as const, label: "IMDb URL", placeholder: "https://imdb.com/name/..." },
                      { name: "actors_access_url" as const, label: "Actors Access URL", placeholder: "https://actorsaccess.com/..." },
                      { name: "backstage_url" as const, label: "Backstage URL", placeholder: "https://backstage.com/..." },
                      { name: "casting_networks_url" as const, label: "Casting Networks URL", placeholder: "https://castingnetworks.com/..." },
                    ].map(({ name, label, placeholder }) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label} <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl>
                            <Input type="text" placeholder={placeholder} {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>

                  <p className="text-sm font-medium pt-2">Commercial size card <span className="text-muted-foreground font-normal">(optional)</span></p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: "shirt_size" as const, label: "Shirt" },
                      { name: "pants_size" as const, label: "Pants" },
                      { name: "shoe_size" as const, label: "Shoe" },
                    ].map(({ name, label }) => (
                      <FormField key={name} control={form.control} name={name} render={({ field }) => (
                        <FormItem>
                          <FormLabel>{label}</FormLabel>
                          <FormControl><Input placeholder="e.g. M / 32 / 10" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                  </div>

                  {serverError && <p className="text-destructive text-sm">{serverError}</p>}
                </>
              )}

              {/* Navigation */}
              <div className="flex justify-between pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep((s) => s - 1)}
                  disabled={step === 0}
                >
                  Back
                </Button>
                {step < STEPS.length - 1 ? (
                  <Button type="button" onClick={nextStep}>Continue</Button>
                ) : (
                  <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save profile"}
                  </Button>
                )}
              </div>

            </form>
          </Form>
        </CardContent>
      </Card>

      <p className="text-center text-muted-foreground text-xs">
        Step {step + 1} of {STEPS.length}
      </p>
    </div>
  )
}
