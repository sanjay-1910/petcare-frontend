document.addEventListener("DOMContentLoaded", async () => {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("No user session. Please log in.");
    window.location.href = "login.html";
    return;
  }

  const editProfileBtn = document.getElementById("edit-profile");
  const saveProfileBtn = document.getElementById("save-profile");
  const profileNameInput = document.getElementById("profile-name");
  const profileEmailInput = document.getElementById("profile-email");
  const profilePictureUpload = document.getElementById("profilePictureUpload");
  const profilePreview = document.getElementById("profilePreview");
  const savePetProfileBtn = document.getElementById("save-pet-profile");
  const editPetProfileBtn = document.getElementById("edit-pet-profile");
  // const prof = document.getElementById("prof");
  // Edit profile
  editProfileBtn.addEventListener("click", () => {
    profileNameInput.removeAttribute("disabled");
    profileEmailInput.removeAttribute("disabled");
    editProfileBtn.style.display = "none";
    saveProfileBtn.style.display = "inline-block";
    profilePictureUpload.classList.remove("hidden");
  });

  // Save profile
  saveProfileBtn.addEventListener("click", async () => {
    const name = profileNameInput.value;
    const email = profileEmailInput.value;

    const response = await fetch("http://localhost:5002/updateProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, name, email })
    });

    const data = await response.json();
    if (data.success) {
      alert("Profile updated successfully!");
      profileNameInput.setAttribute("disabled", true);
      profileEmailInput.setAttribute("disabled", true);
      saveProfileBtn.style.display = "none";
      editProfileBtn.style.display = "inline-block";
      
    } else {
      alert("Profile update failed.");
    }
  });

  // Profile picture upload
  profilePictureUpload.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      profilePreview.src = e.target.result;
    };
    reader.readAsDataURL(file);

    const formData = new FormData();
    formData.append("profile_picture", file);
    formData.append("userId", userId);

    fetch("http://localhost:5002/updateProfilePicture", {
      method: "POST",
      body: formData,
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Profile picture updated successfully!");
        } else {
          alert("Failed to update profile picture.");
        }
      })
      .catch(err => console.error("Upload error:", err));
  });

  // Load user and pet details
  try {
    const response = await fetch(`http://localhost:5002/user/${userId}`);
    const data = await response.json();

    if (response.ok) {
      const user = data.user;
      document.getElementById("profile-name-display").textContent = user.username;
      document.getElementById("profile-name").value = user.name;
      document.getElementById("profile-email").value = user.email;
      // if (user.profile_picture) {
      //   profilePreview.src = user.profile_picture;
      // }
      if (user.profile_picture) {
    profilePreview.src = `http://localhost:5002/profilePicture/${userId}`;
    }


      if (data.pets.length > 0) {
        const pet = data.pets[0];
        document.getElementById("pet-name").value = pet.pet_name;
        document.getElementById("pet-type").value = pet.pet_type;
        document.getElementById("pet-breed").value = pet.pet_breed;
        document.getElementById("pet-age").value = pet.pet_age;
        document.getElementById("pet-weight").value = pet.pet_weight;
      }
    } else {
      alert("Failed to fetch user data.");
    }
  } catch (error) {
    console.error("Error loading user data:", error);
  }

  // Toggle pet profile edit/save
  editPetProfileBtn.addEventListener("click", () => {
    document.querySelectorAll(".pet-profile-section input, .pet-profile-section select").forEach(input => input.removeAttribute("disabled"));
    editPetProfileBtn.style.display = "none";
    savePetProfileBtn.style.display = "inline-block";
  });

  savePetProfileBtn.addEventListener("click", async () => {
    const pet_name = document.getElementById("pet-name").value;
    const pet_type = document.getElementById("pet-type").value;
    const pet_breed = document.getElementById("pet-breed").value;
    const pet_age = document.getElementById("pet-age").value;
    const pet_weight = document.getElementById("pet-weight").value;

    const response = await fetch("http://localhost:5002/savePetProfile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId, pet_name, pet_type, pet_breed, pet_age, pet_weight
      })
    });

    const data = await response.json();
    if (data.success) {
      alert("Pet profile saved!");
      document.querySelectorAll(".pet-profile-section input, .pet-profile-section select").forEach(input => input.setAttribute("disabled", true));
      savePetProfileBtn.style.display = "none";
      editPetProfileBtn.style.display = "inline-block";
    } else {
      alert("Failed to save pet profile.");
    }
  });
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  try {
    const response = await fetch("http://localhost:5002/logout", {
      method: "POST",
      credentials: "include" // send cookies (for session)
    });

    const data = await response.json();
    if (response.ok) {
      alert(data.message); // optional
      localStorage.removeItem("userId"); // clear stored userId
      window.location.href = "/index.html"; // redirect to login
    } else {
      alert("Logout failed: " + data.message);
    }
  } catch (error) {
    console.error("Logout error:", error);
    alert("Something went wrong during logout");
  }
});
