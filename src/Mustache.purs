module Mustache where

import Prelude
import Control.Monad.Eff (Eff, runPure)
import Control.Monad.Eff.Exception (EXCEPTION, Error, try)
import Control.Monad.Error.Class (class MonadError, throwError)
import Data.Either (either)
import Data.Foreign (Foreign)

foreign import renderEff :: ∀ ε. String -> Foreign -> Eff (exception :: EXCEPTION | ε) String

render :: ∀ m. (MonadError Error m) => String -> Foreign -> m String
render template view = runPure $ map toMonad $ try $ renderEff template view where
    toMonad = either throwError pure
