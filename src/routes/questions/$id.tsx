import { convexQuery } from "@convex-dev/react-query";
import { useForm } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { ArrowLeft, Calendar, TrendingUp, CheckCircle } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const currentUserQueryOptions = convexQuery(api.users.getCurrentUser, {});

export const Route = createFileRoute("/questions/$id")({
  loader: async ({ context: { queryClient }, params }) => {
    const id = params.id as Id<"questions">;
    if ((window as any).Clerk?.session) {
      await queryClient.ensureQueryData(currentUserQueryOptions);
    }
    await queryClient.ensureQueryData(convexQuery(api.questions.get, { id }));
    await queryClient.ensureQueryData(
      convexQuery(api.forecasts.getForQuestion, { questionId: id })
    );
    await queryClient.ensureQueryData(
      convexQuery(api.forecasts.listForQuestion, { questionId: id })
    );
  },
  component: QuestionDetailPage,
});

const binaryForecastSchema = z.object({
  probability: z.number().min(0).max(100),
  confidence: z.number().min(1).max(10),
});

const numericForecastSchema = z.object({
  prediction: z.number(),
  confidence: z.number().min(1).max(10),
});

function QuestionDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const questionId = id as Id<"questions">;
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  const { data: currentUser } = useSuspenseQuery(currentUserQueryOptions);
  const { data: question } = useSuspenseQuery(
    convexQuery(api.questions.get, { id: questionId })
  );
  const { data: userForecast } = useSuspenseQuery(
    convexQuery(api.forecasts.getForQuestion, { questionId })
  );
  const { data: allForecasts } = useSuspenseQuery(
    convexQuery(api.forecasts.listForQuestion, { questionId })
  );

  if (!question) {
    return <div>Question not found</div>;
  }

  const isCreator = currentUser?._id === question.createdBy;

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

      <div className="not-prose mb-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-2">
            <div className="badge badge-primary">
              {question.type === "binary" ? "Yes/No" : "Numeric"}
            </div>
            <div
              className={`badge ${
                question.status === "open"
                  ? "badge-success"
                  : question.status === "closed"
                    ? "badge-warning"
                    : "badge-neutral"
              }`}
            >
              {question.status}
            </div>
          </div>
          {isCreator && question.status !== "resolved" && (
            <button
              className="btn btn-sm btn-success"
              onClick={() => setShowResolveDialog(true)}
            >
              <CheckCircle className="w-4 h-4" />
              Resolve Question
            </button>
          )}
        </div>
        <h1 className="mt-0">{question.title}</h1>
        <p className="opacity-70">{question.description}</p>
        <div className="flex items-center gap-2 text-sm mt-4">
          <Calendar className="w-4 h-4" />
          <span>
            Closes {new Date(question.closeTime).toLocaleDateString()} at{" "}
            {new Date(question.closeTime).toLocaleTimeString()}
          </span>
        </div>
        {question.status === "resolved" && question.resolution !== undefined && (
          <div className="alert alert-info mt-4">
            <TrendingUp className="w-5 h-5" />
            <span>
              <strong>Resolved:</strong>{" "}
              {question.type === "binary"
                ? question.resolution
                  ? "Yes"
                  : "No"
                : question.resolution}
            </span>
          </div>
        )}
      </div>

      {question.status === "open" && Date.now() < question.closeTime && (
        <div className="not-prose mb-8">
          {question.type === "binary" ? (
            <BinaryForecastForm
              questionId={questionId}
              existingForecast={userForecast}
            />
          ) : (
            <NumericForecastForm
              questionId={questionId}
              existingForecast={userForecast}
              minValue={question.minValue ?? 0}
              maxValue={question.maxValue ?? 100}
            />
          )}
        </div>
      )}

      <div className="not-prose">
        <h2 className="text-xl font-bold mb-4">
          Forecasts ({allForecasts.length})
        </h2>
        {allForecasts.length === 0 ? (
          <div className="p-8 bg-base-200 rounded-lg text-center">
            <p className="opacity-70">No forecasts yet. Be the first!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>
                    {question.type === "binary" ? "Probability" : "Prediction"}
                  </th>
                  <th>Confidence</th>
                  {question.status === "resolved" && (
                    <>
                      <th>Score</th>
                      <th>Clips Change</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {allForecasts.map((forecast) => (
                  <tr key={forecast._id}>
                    <td>{forecast.userName}</td>
                    <td>
                      {question.type === "binary"
                        ? `${forecast.probability}%`
                        : forecast.prediction}
                    </td>
                    <td>{forecast.confidence}/10</td>
                    {question.status === "resolved" && (
                      <>
                        <td>{forecast.score?.toFixed(1) ?? "—"}</td>
                        <td
                          className={
                            (forecast.clipsChange ?? 0) > 0
                              ? "text-success"
                              : "text-error"
                          }
                        >
                          {forecast.clipsChange !== undefined
                            ? `${forecast.clipsChange > 0 ? "+" : ""}${forecast.clipsChange} 📎`
                            : "—"}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showResolveDialog && (
        <ResolveDialog
          question={question}
          questionId={questionId}
          onClose={() => setShowResolveDialog(false)}
        />
      )}
    </>
  );
}

function BinaryForecastForm({
  questionId,
  existingForecast,
}: {
  questionId: Id<"questions">;
  existingForecast: any;
}) {
  const submitForecast = useMutation(api.forecasts.submit);

  const form = useForm({
    defaultValues: {
      probability: existingForecast?.probability ?? 50,
      confidence: existingForecast?.confidence ?? 5,
    },
    validators: {
      onChange: binaryForecastSchema,
    },
    onSubmit: async ({ value }) => {
      await submitForecast({
        questionId,
        probability: value.probability,
        confidence: value.confidence,
      });
    },
  });

  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <h3 className="card-title text-lg">
          {existingForecast ? "Update Your Forecast" : "Submit Your Forecast"}
        </h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="space-y-6">
            <form.Field name="probability">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Probability of "Yes" ({field.state.value}%)
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="range range-primary"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.valueAsNumber)
                    }
                  />
                  <div className="flex justify-between text-xs opacity-70 mt-1">
                    <span>0% (No)</span>
                    <span>50%</span>
                    <span>100% (Yes)</span>
                  </div>
                </div>
              )}
            </form.Field>

            <form.Field name="confidence">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Confidence ({field.state.value}/10)
                    </span>
                    <span className="label-text-alt opacity-70">
                      Higher confidence = more clips at stake
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    className="range range-secondary"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.valueAsNumber)
                    }
                  />
                  <div className="flex justify-between text-xs opacity-70 mt-1">
                    <span>1 (Low)</span>
                    <span>5</span>
                    <span>10 (High)</span>
                  </div>
                </div>
              )}
            </form.Field>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!form.state.canSubmit || form.state.isSubmitting}
            >
              {form.state.isSubmitting
                ? "Submitting..."
                : existingForecast
                  ? "Update Forecast"
                  : "Submit Forecast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumericForecastForm({
  questionId,
  existingForecast,
  minValue,
  maxValue,
}: {
  questionId: Id<"questions">;
  existingForecast: any;
  minValue: number;
  maxValue: number;
}) {
  const submitForecast = useMutation(api.forecasts.submit);

  const form = useForm({
    defaultValues: {
      prediction: existingForecast?.prediction ?? (minValue + maxValue) / 2,
      confidence: existingForecast?.confidence ?? 5,
    },
    validators: {
      onChange: numericForecastSchema,
    },
    onSubmit: async ({ value }) => {
      await submitForecast({
        questionId,
        prediction: value.prediction,
        confidence: value.confidence,
      });
    },
  });

  return (
    <div className="card card-border bg-base-200">
      <div className="card-body">
        <h3 className="card-title text-lg">
          {existingForecast ? "Update Your Forecast" : "Submit Your Forecast"}
        </h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void form.handleSubmit();
          }}
        >
          <div className="space-y-6">
            <form.Field name="prediction">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Your Prediction</span>
                    <span className="label-text-alt opacity-70">
                      Range: {minValue} - {maxValue}
                    </span>
                  </label>
                  <input
                    type="number"
                    min={minValue}
                    max={maxValue}
                    step="any"
                    className="input input-bordered w-full"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.valueAsNumber)
                    }
                  />
                </div>
              )}
            </form.Field>

            <form.Field name="confidence">
              {(field) => (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">
                      Confidence ({field.state.value}/10)
                    </span>
                    <span className="label-text-alt opacity-70">
                      Higher confidence = more clips at stake
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    className="range range-secondary"
                    value={field.state.value}
                    onChange={(e) =>
                      field.handleChange(e.target.valueAsNumber)
                    }
                  />
                  <div className="flex justify-between text-xs opacity-70 mt-1">
                    <span>1 (Low)</span>
                    <span>5</span>
                    <span>10 (High)</span>
                  </div>
                </div>
              )}
            </form.Field>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={!form.state.canSubmit || form.state.isSubmitting}
            >
              {form.state.isSubmitting
                ? "Submitting..."
                : existingForecast
                  ? "Update Forecast"
                  : "Submit Forecast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResolveDialog({
  question,
  questionId,
  onClose,
}: {
  question: any;
  questionId: Id<"questions">;
  onClose: () => void;
}) {
  const resolveQuestion = useMutation(api.questions.resolve);
  const scoreForecasts = useMutation(api.forecasts.scoreForecasts);
  const [isResolving, setIsResolving] = useState(false);

  const handleResolve = async (resolution: boolean | number) => {
    setIsResolving(true);
    try {
      await resolveQuestion({ id: questionId, resolution });
      await scoreForecasts({ questionId });
      onClose();
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <dialog open className="modal">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">Resolve Question</h3>
        <p className="mb-4 opacity-70">{question.title}</p>

        {question.type === "binary" ? (
          <div className="flex flex-col gap-3">
            <button
              className="btn btn-success btn-lg"
              disabled={isResolving}
              onClick={() => void handleResolve(true)}
            >
              {isResolving ? "Resolving..." : "Yes"}
            </button>
            <button
              className="btn btn-error btn-lg"
              disabled={isResolving}
              onClick={() => void handleResolve(false)}
            >
              {isResolving ? "Resolving..." : "No"}
            </button>
          </div>
        ) : (
          <div>
            <label className="label">
              <span className="label-text">Enter the actual value</span>
              <span className="label-text-alt">
                Range: {question.minValue ?? 0} - {question.maxValue ?? 100}
              </span>
            </label>
            <input
              type="number"
              min={question.minValue ?? 0}
              max={question.maxValue ?? 100}
              step="any"
              className="input input-bordered w-full mb-4"
              id="resolution-value"
              disabled={isResolving}
            />
            <button
              className="btn btn-primary w-full"
              disabled={isResolving}
              onClick={() => {
                const input = document.getElementById(
                  "resolution-value"
                ) as HTMLInputElement;
                void handleResolve(parseFloat(input.value));
              }}
            >
              {isResolving ? "Resolving..." : "Resolve"}
            </button>
          </div>
        )}

        <div className="modal-action">
          <button className="btn btn-ghost" onClick={onClose} disabled={isResolving}>
            Cancel
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </dialog>
  );
}
