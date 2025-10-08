import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft } from "lucide-react";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";

export const Route = createFileRoute("/questions/new")({
  component: NewQuestionPage,
});

const questionSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  closeDate: z.string().min(1, "Close date is required"),
  closeTime: z.string().min(1, "Close time is required"),
});

function NewQuestionPage() {
  const navigate = useNavigate();
  const createQuestion = useMutation(api.questions.create);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      closeDate: "",
      closeTime: "23:59",
    },
    validators: {
      onChange: questionSchema,
    },
    onSubmit: async ({ value }) => {
      const closeTimeMs = new Date(`${value.closeDate}T${value.closeTime}`).getTime();

      await createQuestion({
        title: value.title,
        description: value.description,
        closeTime: closeTimeMs,
      });

      void navigate({ to: "/" });
    },
  });

  return (
    <>
      <div className="not-prose mb-6">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => void navigate({ to: "/" })}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Questions
        </button>
      </div>

      <h1>Create New Question</h1>

      <form
        className="not-prose"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="space-y-6 max-w-2xl">
          <form.Field name="title">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor="title" className="block text-sm font-medium">
                  Question Title
                </label>
                <input
                  id="title"
                  type="text"
                  className={`input input-bordered w-full ${
                    field.state.meta.isTouched && !field.state.meta.isValid
                      ? "input-error"
                      : ""
                  }`}
                  placeholder="Will X happen by Y date?"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <p className="text-sm text-error mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor="description" className="block text-sm font-medium">
                  Description
                </label>
                <textarea
                  id="description"
                  className={`textarea textarea-bordered h-24 w-full ${
                    field.state.meta.isTouched && !field.state.meta.isValid
                      ? "textarea-error"
                      : ""
                  }`}
                  placeholder="Provide context and resolution criteria..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <p className="text-sm text-error mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="closeDate">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor="closeDate" className="block text-sm font-medium">
                  Close Date
                </label>
                <input
                  id="closeDate"
                  type="date"
                  className={`input input-bordered w-full ${
                    field.state.meta.isTouched && !field.state.meta.isValid
                      ? "input-error"
                      : ""
                  }`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  min={new Date().toISOString().split("T")[0]}
                />
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <p className="text-sm text-error mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="closeTime">
            {(field) => (
              <div className="space-y-2">
                <label htmlFor="closeTime" className="block text-sm font-medium">
                  Close Time
                </label>
                <select
                  id="closeTime"
                  className={`select select-bordered w-full ${
                    field.state.meta.isTouched && !field.state.meta.isValid
                      ? "select-error"
                      : ""
                  }`}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                >
                  <option value="23:59">End of Day (11:59 PM)</option>
                  <option value="12:00">Noon (12:00 PM)</option>
                  <option value="09:00">Morning (9:00 AM)</option>
                  <option value="17:00">Evening (5:00 PM)</option>
                  <option value="00:00">Midnight (12:00 AM)</option>
                </select>
                {field.state.meta.isTouched && !field.state.meta.isValid && (
                  <p className="text-sm text-error mt-1">
                    {field.state.meta.errors.map((e) => e?.message).join(", ")}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!form.state.canSubmit || form.state.isSubmitting}
            >
              {form.state.isSubmitting ? "Creating..." : "Create Question"}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void navigate({ to: "/" })}
            >
              Cancel
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
