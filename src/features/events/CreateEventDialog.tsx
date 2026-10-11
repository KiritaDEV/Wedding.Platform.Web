import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Button } from "../../components/ui/Button";
import { Dialog, DialogFooter, DialogHeader } from "../../components/ui/Dialog";
import { Disclosure } from "../../components/ui/Disclosure";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { ApiError } from "../../lib/api";
import { authErrorMessage } from "../auth/errorMessage";
import { createEvent } from "./eventsApi";
import { createEventSchema, type CreateEventFormValues } from "./schemas";
import type { Event } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (event: Event) => void;
};

export function CreateEventDialog({ open, onClose, onCreated }: Props) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateEventFormValues>({
    resolver: zodResolver(createEventSchema),
    defaultValues: { name: "", type: "wedding", eventDate: "", slug: "", timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" },
  });

  function close() {
    if (isSubmitting) return;
    setFormError(null);
    reset();
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const event = await createEvent({
        name: values.name,
        type: values.type,
        ...(values.eventDate ? { eventDate: values.eventDate } : {}),
        ...(values.slug ? { slug: values.slug } : {}),
        timeZone: values.timeZone,
      });
      reset();
      onCreated(event);
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ["name", "type", "eventDate", "slug", "timeZone"] as const) {
          const message = error.validationErrors[field]?.[0];
          if (message) setError(field, { message });
        }
      }
      setFormError(authErrorMessage(error));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={close}
      closeDisabled={isSubmitting}
      titleId="create-event-title"
      descriptionId="create-event-description"
    >
      <form className="space-y-4.5 p-5 sm:p-6" onSubmit={onSubmit} noValidate>
        <DialogHeader eyebrow="New event" title="Create Event" titleId="create-event-title" description="Add the essentials now. You can shape the experience later." descriptionId="create-event-description" onClose={close} closeDisabled={isSubmitting} closeLabel="Close create event dialog" titleClassName="text-xl tracking-tight" />

        {formError && (
          <p
            className="rounded-xl bg-danger-muted p-3 text-sm text-danger"
            role="alert"
          >
            {formError}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium" htmlFor="event-name">
            Event name
          </label>
          <Input
            autoFocus
            className="mt-1"
            id="event-name"
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1.5 text-sm text-danger">{errors.name.message}</p>
          )}
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label
              className="block text-sm font-medium"
              id="event-type-label"
              htmlFor="event-type"
            >
              Event type
            </label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  className="mt-1"
                  id="event-type"
                  name={field.name}
                  value={field.value}
                  options={[{ value: "wedding", label: "Wedding" }]}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-labelledby="event-type-label"
                />
              )}
            />
            {errors.type && (
              <p className="mt-1.5 text-sm text-danger">
                {errors.type.message}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="event-date">
              Event date{" "}
              <span className="text-foreground-muted">(optional)</span>
            </label>
            <Input
              className="mt-1"
              id="event-date"
              type="date"
              {...register("eventDate")}
            />
            {errors.eventDate && (
              <p className="mt-1.5 text-sm text-danger">
                {errors.eventDate.message}
              </p>
            )}
          </div>
        </div>

        <Disclosure summary="Advanced options">
          <div>
            <label className="block text-sm font-medium" htmlFor="event-slug">
              Custom URL slug{" "}
              <span className="text-foreground-muted">(optional)</span>
            </label>
            <Input
              className="mt-1"
              id="event-slug"
              placeholder="neil-hazel"
              {...register("slug")}
            />
            <p className="mt-1.5 text-xs text-foreground-muted">
              Lowercase letters, numbers, and hyphens only.
            </p>
            {errors.slug && (
              <p className="mt-1.5 text-sm text-danger">
                {errors.slug.message}
              </p>
            )}
          </div>
        </Disclosure>

        <DialogFooter className="flex-col-reverse gap-2.5 border-t border-border pt-4 sm:flex-row">
          <Button
            variant="secondary"
            type="button"
            size="sm"
            disabled={isSubmitting}
            onClick={close}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting} size="sm">
            {isSubmitting ? "Creating…" : "Create Event"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
