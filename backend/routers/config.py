"""Configuration management routes for roles, positions, departments"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db, Role, Position, Department
from schemas import Role as RoleSchema, RoleCreate, RoleUpdate, Position as PositionSchema, PositionCreate, PositionUpdate, Department as DepartmentSchema, DepartmentCreate, DepartmentUpdate

router = APIRouter(prefix="/api/config", tags=["config"])

# ===== ROLES =====
@router.get("/roles", response_model=List[RoleSchema])
def get_roles(project_id: int = None, db: Session = Depends(get_db)):
    """Get all roles (global or project-specific)"""
    query = db.query(Role)
    if project_id:
        query = query.filter((Role.project_id == project_id) | (Role.project_id == None))
    else:
        query = query.filter(Role.project_id == None)
    return query.order_by(Role.order, Role.name).all()

@router.post("/roles", response_model=RoleSchema)
def create_role(role: RoleCreate, project_id: int = None, db: Session = Depends(get_db)):
    """Create new role"""
    db_role = Role(project_id=project_id, **role.model_dump())
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

@router.put("/roles/{role_id}", response_model=RoleSchema)
def update_role(role_id: int, role: RoleUpdate, db: Session = Depends(get_db)):
    """Update role"""
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if db_role.is_default and role.name and role.name != db_role.name:
        raise HTTPException(status_code=400, detail="Cannot rename default role")
    
    for key, value in role.model_dump(exclude_unset=True).items():
        setattr(db_role, key, value)
    
    db.commit()
    db.refresh(db_role)
    return db_role

@router.delete("/roles/{role_id}")
def delete_role(role_id: int, db: Session = Depends(get_db)):
    """Delete role"""
    db_role = db.query(Role).filter(Role.id == role_id).first()
    if not db_role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    if db_role.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default role")
    
    db.delete(db_role)
    db.commit()
    return {"message": "Role deleted successfully"}

# ===== POSITIONS =====
@router.get("/positions", response_model=List[PositionSchema])
def get_positions(project_id: int = None, db: Session = Depends(get_db)):
    """Get all positions (global or project-specific)"""
    query = db.query(Position)
    if project_id:
        query = query.filter((Position.project_id == project_id) | (Position.project_id == None))
    else:
        query = query.filter(Position.project_id == None)
    return query.order_by(Position.order, Position.name).all()

@router.post("/positions", response_model=PositionSchema)
def create_position(position: PositionCreate, project_id: int = None, db: Session = Depends(get_db)):
    """Create new position"""
    db_position = Position(project_id=project_id, **position.model_dump())
    db.add(db_position)
    db.commit()
    db.refresh(db_position)
    return db_position

@router.put("/positions/{position_id}", response_model=PositionSchema)
def update_position(position_id: int, position: PositionUpdate, db: Session = Depends(get_db)):
    """Update position"""
    db_position = db.query(Position).filter(Position.id == position_id).first()
    if not db_position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    if db_position.is_default and position.name and position.name != db_position.name:
        raise HTTPException(status_code=400, detail="Cannot rename default position")
    
    for key, value in position.model_dump(exclude_unset=True).items():
        setattr(db_position, key, value)
    
    db.commit()
    db.refresh(db_position)
    return db_position

@router.delete("/positions/{position_id}")
def delete_position(position_id: int, db: Session = Depends(get_db)):
    """Delete position"""
    db_position = db.query(Position).filter(Position.id == position_id).first()
    if not db_position:
        raise HTTPException(status_code=404, detail="Position not found")
    
    if db_position.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default position")
    
    db.delete(db_position)
    db.commit()
    return {"message": "Position deleted successfully"}

# ===== DEPARTMENTS =====
@router.get("/departments", response_model=List[DepartmentSchema])
def get_departments(project_id: int = None, db: Session = Depends(get_db)):
    """Get all departments (global or project-specific)"""
    query = db.query(Department)
    if project_id:
        query = query.filter((Department.project_id == project_id) | (Department.project_id == None))
    else:
        query = query.filter(Department.project_id == None)
    return query.order_by(Department.order, Department.name).all()

@router.post("/departments", response_model=DepartmentSchema)
def create_department(department: DepartmentCreate, project_id: int = None, db: Session = Depends(get_db)):
    """Create new department"""
    db_department = Department(project_id=project_id, **department.model_dump())
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

@router.put("/departments/{department_id}", response_model=DepartmentSchema)
def update_department(department_id: int, department: DepartmentUpdate, db: Session = Depends(get_db)):
    """Update department"""
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if db_department.is_default and department.name and department.name != db_department.name:
        raise HTTPException(status_code=400, detail="Cannot rename default department")
    
    for key, value in department.model_dump(exclude_unset=True).items():
        setattr(db_department, key, value)
    
    db.commit()
    db.refresh(db_department)
    return db_department

@router.delete("/departments/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):
    """Delete department"""
    db_department = db.query(Department).filter(Department.id == department_id).first()
    if not db_department:
        raise HTTPException(status_code=404, detail="Department not found")
    
    if db_department.is_default:
        raise HTTPException(status_code=400, detail="Cannot delete default department")
    
    db.delete(db_department)
    db.commit()
    return {"message": "Department deleted successfully"}
