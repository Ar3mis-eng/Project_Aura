<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;

class TeacherController extends Controller
{
    public function index(Request $request)
    {
        // Return all users with role 'teacher' or 'counselor'
        $teachers = User::whereIn('role', ['teacher', 'counselor', 'admin'])
            ->select('id', 'first_name', 'middle_name', 'last_name', 'email', 'role')
            ->orderBy('first_name')
            ->get();
        
        return response()->json(['data' => $teachers]);
    }
}
