import { useNavigate } from 'react-router'
import { ApiError } from '../api/http'
import { usePlaceHold } from '../api/queries'
import { useToast } from '../components/Toasts'
import { useI18n } from '../i18n/I18nProvider'
import { useStudent } from '../student/StudentProvider'

/**
 * Applying for a seat, wherever the button is: asks for the birth registration number
 * first if there is none, then opens the new application, or the existing one if the
 * student already applied (perhaps in another tab).
 */
export function useApply() {
  const { t, describeError } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { studentId, askForStudentId } = useStudent()
  const placeHold = usePlaceHold()

  function apply(classId: string) {
    if (studentId === null) {
      askForStudentId()
      return
    }

    placeHold.mutate(
      { classId, studentId },
      {
        onSuccess: (hold) => {
          toast.success(t('apply.success'))
          navigate(`/applications/${hold.holdId}`)
        },
        onError: (error) => {
          const existing = error instanceof ApiError && error.code === 'ALREADY_APPLIED' ? error.details.holdId : null
          if (typeof existing === 'string') {
            toast.info(t('error.ALREADY_APPLIED'))
            navigate(`/applications/${existing}`)
            return
          }
          toast.error(describeError(error))
        },
      },
    )
  }

  return {
    apply,
    /** True while any application is being sent; the class it is for is `applyingTo`. */
    busy: placeHold.isPending,
    applyingTo: placeHold.isPending ? placeHold.variables?.classId : undefined,
  }
}
