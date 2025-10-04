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
  type: z.enum(["binary", "numeric"]),
  closeTime: z.string().min(1, "Close date is required"),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
});

function NewQuestionPage() {
  const navigate = useNavigate();
  const createQuestion = useMutation(api.questions.create);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      type: "binary" as "binary" | "numeric",
      closeTime: "",
      minValue: 0,
      maxValue: 100,
    },
    validators: {
      onChange: questionSchema,
    },
    onSubmit: async ({ value }) => {
      const closeTimeMs = new Date(value.closeTime).getTime();

      await createQuestion({
        title: value.title,
        description: value.description,
        type: value.type,
        closeTime: closeTimeMs,
        minValue: value.type === "numeric" ? value.minValue : undefined,
        maxValue: value.type === "numeric" ? value.maxValue : undefined,
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
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Question Title</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  placeholder="Will X happen by Y date?"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map((e) => e.message).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Description</span>
                </label>
                <textarea
                  className="textarea textarea-bordered h-24"
                  placeholder="Provide context and resolution criteria..."
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map((e) => e.message).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="type">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Question Type</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(e.target.value as "binary" | "numeric")
                  }
                >
                  <option value="binary">Yes/No (Binary)</option>
                  <option value="numeric">Numeric Range</option>
                </select>
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.type}>
            {(type) =>
              type === "numeric" && (
                <div className="grid grid-cols-2 gap-4">
                  <form.Field name="minValue">
                    {(field) => (
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Minimum Value</span>
                        </label>
                        <input
                          type="number"
                          className="input input-bordered w-full"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                        />
                      </div>
                    )}
                  </form.Field>

                  <form.Field name="maxValue">
                    {(field) => (
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text">Maximum Value</span>
                        </label>
                        <input
                          type="number"
                          className="input input-bordered w-full"
                          value={field.state.value}
                          onChange={(e) =>
                            field.handleChange(e.target.valueAsNumber)
                          }
                        />
                      </div>
                    )}
                  </form.Field>
                </div>
              )
            }
          </form.Subscribe>

          <form.Field name="closeTime">
            {(field) => (
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Close Date & Time</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
                {!field.state.meta.isValid && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {field.state.meta.errors.map((e) => e.message).join(", ")}
                    </span>
                  </label>
                )}
              </div>
            )}
          </form.Field>

          <div className="flex gap-4">
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
