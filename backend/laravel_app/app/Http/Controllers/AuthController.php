<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $data['email'])->first();
        if (!$user || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Invalid credentials'], 422);
        }

        // Increment login count
        $user->increment('login_count');

        $token = $user->createToken('api')->plainTextToken;
        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => trim(($user->first_name ?? $user->name).' '.($user->last_name ?? '')),
                'role' => $user->role ?? 'student',
                'email' => $user->email,
            ]
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        
        $data = $request->validate([
            'first_name' => 'nullable|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'email' => 'required|email|unique:users,email,' . $user->id,
            'contact_number' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:500',
        ]);

        $user->update($data);
        
        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => $user
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();
        
        $data = $request->validate([
            'current_password' => 'required|string',
            'new_password' => 'required|string|min:6|confirmed',
        ]);

        if (!Hash::check($data['current_password'], $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update([
            'password' => Hash::make($data['new_password'])
        ]);

        return response()->json(['message' => 'Password changed successfully']);
    }

    public function uploadProfilePhoto(Request $request)
    {
        $user = $request->user();
        
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // Max 2MB
        ]);

        // Delete old photo if exists
        if ($user->profile_photo) {
            $oldPhotoPath = public_path('storage/' . $user->profile_photo);
            if (file_exists($oldPhotoPath)) {
                unlink($oldPhotoPath);
            }
        }

        // Store new photo
        $path = $request->file('photo')->store('profile_photos', 'public');
        
        $user->update([
            'profile_photo' => $path
        ]);

        return response()->json([
            'message' => 'Profile photo uploaded successfully',
            'photo_url' => asset('storage/' . $path),
            'photo_path' => $path
        ]);
    }

    public function deleteProfilePhoto(Request $request)
    {
        $user = $request->user();
        
        if ($user->profile_photo) {
            $photoPath = public_path('storage/' . $user->profile_photo);
            if (file_exists($photoPath)) {
                unlink($photoPath);
            }
            
            $user->update(['profile_photo' => null]);
        }

        return response()->json(['message' => 'Profile photo deleted successfully']);
    }
}
