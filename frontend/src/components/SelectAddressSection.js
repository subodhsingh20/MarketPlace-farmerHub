import { useState } from "react";

const EMPTY_ADDRESS_FORM = {
  label: "",
  name: "",
  street: "",
  city: "",
  state: "",
  pincode: "",
};

function SelectAddressSection({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onAddAddress,
  isSubmitting,
  saveError,
}) {
  const [isFormOpen, setIsFormOpen] = useState(addresses.length === 0);
  const [formValues, setFormValues] = useState(EMPTY_ADDRESS_FORM);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (field, value) => {
    setFormValues((current) => ({ ...current, [field]: value }));
    setValidationErrors((current) => ({ ...current, [field]: "" }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};

    Object.entries(formValues).forEach(([field, value]) => {
      if (!String(value || "").trim()) {
        nextErrors[field] = `${field.charAt(0).toUpperCase()}${field.slice(1)} is required.`;
      }
    });

    if (formValues.pincode && !/^\d{6}$/.test(formValues.pincode.trim())) {
      nextErrors.pincode = "Pincode must be a 6-digit number.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setValidationErrors(nextErrors);
      return;
    }

    const savedAddress = await onAddAddress(
      Object.fromEntries(
        Object.entries(formValues).map(([field, value]) => [field, value.trim()])
      )
    );

    if (savedAddress) {
      setFormValues(EMPTY_ADDRESS_FORM);
      setValidationErrors({});
      setIsFormOpen(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Select Address</h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose a saved address or add a new delivery address before checkout.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          onClick={() => setIsFormOpen((current) => !current)}
        >
          {isFormOpen ? "Hide Form" : "Add New Address"}
        </button>
      </div>

      <div className="mt-6 space-y-4">
        {addresses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-800">
            No saved addresses yet. Add one to continue with checkout.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {addresses.map((address) => {
              const isSelected = selectedAddressId === address._id;

              return (
                <label
                  key={address._id}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    isSelected
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-gray-200 bg-gray-50 hover:border-emerald-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="selected-address"
                      className="mt-1 h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                      checked={isSelected}
                      onChange={() => onSelectAddress(address._id)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
                          {address.label}
                        </span>
                        {isSelected && (
                          <span className="text-xs font-semibold text-emerald-700">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-semibold text-gray-900">{address.name}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {address.street}
                        <br />
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {isFormOpen && (
          <form
            className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
            onSubmit={handleSubmit}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ["label", "Label"],
                ["name", "Name"],
                ["street", "Street"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "Pincode"],
              ].map(([field, label]) => (
                <div key={field} className={field === "street" ? "sm:col-span-2" : ""}>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    {label}
                  </label>
                  <input
                    type="text"
                    value={formValues[field]}
                    onChange={(event) => handleChange(field, event.target.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                      validationErrors[field] ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
                    }`}
                    placeholder={label === "Label" ? "Home / Work" : `Enter ${label.toLowerCase()}`}
                  />
                  {validationErrors[field] && (
                    <p className="mt-2 text-xs font-medium text-red-600">
                      {validationErrors[field]}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {saveError && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {saveError}
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-white"
                onClick={() => setIsFormOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Address"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SelectAddressSection;
