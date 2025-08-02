import React, { useState, useEffect } from 'react';

// MaterialForm component for adding new materials
function MaterialForm({ API_BASE_URL, onMaterialAdded }) {
  // State to hold form data
  const [formData, setFormData] = useState({
    material_name: '',
    material_type: '',
    unit_of_measure: '',
    brand: '',
    color: '',
    size: '',
    discipline_id: '' // Will store the ID of the selected discipline
  });

  // State for discipline dropdown options
  const [disciplinesList, setDisciplinesList] = useState([]);
  // State for form submission feedback
  const [submitMessage, setSubmitMessage] = useState(null); // e.g., 'Material added successfully!' or 'Error...'
  const [isSubmitting, setIsSubmitting] = useState(false); // To disable button during submission

  // Fetch disciplines when the component mounts
  useEffect(() => {
    fetch(`${API_BASE_URL}disciplines/`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => setDisciplinesList(data))
      .catch(error => {
        console.error("Error fetching disciplines for form:", error);
        setSubmitMessage({ type: 'error', text: 'Failed to load disciplines.' });
      });
  }, [API_BASE_URL]); // Dependency on API_BASE_URL

  // Handle input changes (for all text/number fields)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  // Handle discipline dropdown change specifically
  const handleDisciplineChange = (e) => {
    setFormData(prevData => ({
      ...prevData,
      discipline_id: e.target.value // Store the ID
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    setIsSubmitting(true);
    setSubmitMessage(null); // Clear previous messages

    // Construct payload for the API
    const payload = {
      material_name: formData.material_name,
      material_type: formData.material_type || null, // Send null if empty string
      unit_of_measure: formData.unit_of_measure,
      brand: formData.brand || null,
      color: formData.color || null,
      size: formData.size || null,
      // Send discipline_id if selected, otherwise null
      discipline: formData.discipline_id ? parseInt(formData.discipline_id) : null // Ensure it's an integer ID
    };

    try {
      const response = await fetch(`${API_BASE_URL}materials/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = 'Failed to add material.';

        // Check for specific DRF validation errors
        if (response.status === 400) {
          // Adjusted the string check to match the exact error message from Django
          if (errorData.material_name && errorData.material_name.includes("dim material with this material name already exists.")) {
            errorMessage = "Material name already exists. Please choose a unique name.";
          } else if (errorData.material_name && errorData.material_name.includes("This field must be unique.")) {
            errorMessage = "Material name must be unique. Please choose a different name.";
          } else if (errorData.non_field_errors) {
            errorMessage = `Failed to add material: ${errorData.non_field_errors.join(', ')}`;
          } else {
            // Fallback for other 400 errors
            errorMessage = `Validation error: ${JSON.stringify(errorData)}`;
          }
        } else if (errorData.detail) {
          errorMessage = `Failed to add material: ${errorData.detail}`;
        } else {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        throw new Error(errorMessage); // Throw the parsed message
      }

      const newMaterial = await response.json();
      setSubmitMessage({ type: 'success', text: `Material '${newMaterial.material_name}' added successfully!` });
      // Clear the form after successful submission
      setFormData({
        material_name: '',
        material_type: '',
        unit_of_measure: '',
        brand: '',
        color: '',
        size: '',
        discipline_id: ''
      });
      // Call the parent callback to refresh the materials list
      if (onMaterialAdded) {
        onMaterialAdded(newMaterial);
      }

    } catch (error) {
      console.error("Error adding material:", error);
      setSubmitMessage({ type: 'error', text: `${error.message}` }); // Display the parsed error message
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="material-form-container">
      <h2>Add New Material</h2>
      <form onSubmit={handleSubmit} className="material-form">
        <div className="form-group">
          <label htmlFor="material_name">Material Name:</label>
          <input
            type="text"
            id="material_name"
            name="material_name"
            value={formData.material_name}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="material_type">Material Type:</label>
          <input
            type="text"
            id="material_type"
            name="material_type"
            value={formData.material_type}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="unit_of_measure">Unit of Measure:</label>
          <input
            type="text"
            id="unit_of_measure"
            name="unit_of_measure"
            value={formData.unit_of_measure}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="brand">Brand:</label>
          <input
            type="text"
            id="brand"
            name="brand"
            value={formData.brand}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="color">Color:</label>
          <input
            type="text"
            id="color"
            name="color"
            value={formData.color}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="size">Size:</label>
          <input
            type="text"
            id="size"
            name="size"
            value={formData.size}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label htmlFor="discipline_id">Discipline:</label>
          <select
            id="discipline_id"
            name="discipline_id"
            value={formData.discipline_id}
            onChange={handleDisciplineChange}
          >
            <option value="">Select Discipline (Optional)</option>
            {disciplinesList.map(discipline => (
              <option key={discipline.discipline_id} value={discipline.discipline_id}>
                {discipline.discipline_name}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Material'}
        </button>

        {submitMessage && (
          <p className={`submit-message ${submitMessage.type}`}>
            {submitMessage.text}
          </p>
        )}
      </form>
    </div>
  );
}

export default MaterialForm;
